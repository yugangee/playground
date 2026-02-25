#!/usr/bin/env bash
# =============================================================================
# Playground - Frontend Deploy Script
# Next.js 정적 빌드 → S3 업로드 → CloudFront 배포
# =============================================================================
set -euo pipefail

# ──────────────────────────────────────────────
# 설정값
# ──────────────────────────────────────────────
REGION="us-east-1"
ACCOUNT_ID="887078546492"
FRONTEND_BUCKET="playground-frontend-${ACCOUNT_ID}"
DISTRIBUTION_COMMENT="Playground Web"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="${PROJECT_ROOT}/apps/web"
OUT_DIR="${FRONTEND_DIR}/out"

# ──────────────────────────────────────────────
# 유틸리티
# ──────────────────────────────────────────────
log()  { echo "[$(date '+%H:%M:%S')] $*"; }
ok()   { echo "[$(date '+%H:%M:%S')] ✓ $*"; }
fail() { echo "[$(date '+%H:%M:%S')] ✗ $*" >&2; exit 1; }

check_prerequisites() {
    command -v aws  >/dev/null 2>&1 || fail "aws CLI가 설치되어 있지 않습니다."
    command -v node >/dev/null 2>&1 || fail "Node.js가 설치되어 있지 않습니다."
    command -v npm  >/dev/null 2>&1 || fail "npm이 설치되어 있지 않습니다."
    command -v jq   >/dev/null 2>&1 || fail "jq가 설치되어 있지 않습니다. (brew install jq)"
    ok "필수 도구 확인 완료"
}

# ──────────────────────────────────────────────
# 1. 백엔드 outputs에서 환경변수 읽기
# ──────────────────────────────────────────────
load_backend_outputs() {
    log "백엔드 CDK outputs 읽는 중..."

    STACK_OUTPUTS=$(aws cloudformation describe-stacks \
        --stack-name PlaygroundStack \
        --region "${REGION}" \
        --output json \
        | jq -r '.Stacks[0].Outputs')

    get_output() {
        echo "${STACK_OUTPUTS}" | jq -r ".[] | select(.OutputKey==\"$1\") | .OutputValue"
    }

    API_URL=$(get_output "ApiUrl")
    USER_POOL_ID=$(get_output "UserPoolId")
    USER_POOL_CLIENT_ID=$(get_output "UserPoolClientId")

    [ -n "${API_URL}" ]              || fail "ApiUrl을 찾을 수 없습니다. 백엔드를 먼저 배포하세요."
    [ -n "${USER_POOL_ID}" ]         || fail "UserPoolId를 찾을 수 없습니다."
    [ -n "${USER_POOL_CLIENT_ID}" ]  || fail "UserPoolClientId를 찾을 수 없습니다."

    ok "백엔드 outputs 로드 완료"
}

# ──────────────────────────────────────────────
# 2. Next.js 빌드
# ──────────────────────────────────────────────
build_frontend() {
    log "Next.js 빌드 중..."
    cd "${FRONTEND_DIR}"

    # CloudFront 도메인이 이미 있으면 주입 (재배포 시)
    CF_DOMAIN_FILE="${SCRIPT_DIR}/.cloudfront_domain"
    CF_ORIGIN=""
    if [ -f "${CF_DOMAIN_FILE}" ]; then
        CF_ORIGIN="https://$(cat "${CF_DOMAIN_FILE}")"
    fi

    cat > .env.local <<EOF
NEXT_PUBLIC_API_URL=${API_URL%/}
NEXT_PUBLIC_USER_POOL_ID=${USER_POOL_ID}
NEXT_PUBLIC_USER_POOL_CLIENT_ID=${USER_POOL_CLIENT_ID}
EOF

    npm install --prefer-offline 2>&1 | tail -3
    npm run build

    [ -d "${OUT_DIR}" ] || fail "'out' 디렉토리가 없습니다. next.config.ts의 output: 'export' 확인 필요."
    ok "빌드 완료: ${OUT_DIR}"
    cd -
}

# ──────────────────────────────────────────────
# 3. S3 버킷 설정
# ──────────────────────────────────────────────
setup_frontend_bucket() {
    log "S3 버킷 설정 중: ${FRONTEND_BUCKET}"

    if aws s3api head-bucket --bucket "${FRONTEND_BUCKET}" --region "${REGION}" 2>/dev/null; then
        ok "S3 버킷 이미 존재: ${FRONTEND_BUCKET}"
    else
        aws s3api create-bucket \
            --bucket "${FRONTEND_BUCKET}" \
            --region "${REGION}"
        ok "S3 버킷 생성 완료"
    fi

    aws s3api put-public-access-block \
        --bucket "${FRONTEND_BUCKET}" \
        --public-access-block-configuration \
        "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
    ok "퍼블릭 액세스 차단 완료"
}

# ──────────────────────────────────────────────
# 4. CloudFront Distribution 설정
# ──────────────────────────────────────────────
setup_cloudfront() {
    log "CloudFront Distribution 확인 중..."

    DISTRIBUTION_ID=$(aws cloudfront list-distributions \
        --output json \
        | jq -r ".DistributionList.Items[]? | select(.Comment==\"${DISTRIBUTION_COMMENT}\") | .Id" \
        | head -1)

    if [ -z "${DISTRIBUTION_ID}" ]; then
        log "CloudFront Distribution 생성 중..."

        BUCKET_DOMAIN="${FRONTEND_BUCKET}.s3.${REGION}.amazonaws.com"
        CALLER_REF="playground-$(date +%s)"

        # OAC 생성
        OAC_ID=$(aws cloudfront create-origin-access-control \
            --origin-access-control-config "{
                \"Name\": \"playground-oac\",
                \"Description\": \"Playground OAC\",
                \"SigningProtocol\": \"sigv4\",
                \"SigningBehavior\": \"always\",
                \"OriginAccessControlOriginType\": \"s3\"
            }" \
            --output json | jq -r '.OriginAccessControl.Id')

        # CachePolicyId 상수
        # CachingDisabled  : 4135ea2d-6df8-44a3-9df3-4b5a84be39ad  (HTML용 - 캐시 안 함)
        # CachingOptimized : 658327ea-f89d-4fab-a63d-7e88639e58f6  (정적 자산용 - 1년 캐시)
        DISTRIBUTION_ID=$(aws cloudfront create-distribution \
            --distribution-config "{
                \"CallerReference\": \"${CALLER_REF}\",
                \"Comment\": \"${DISTRIBUTION_COMMENT}\",
                \"DefaultRootObject\": \"index.html\",
                \"Origins\": {
                    \"Quantity\": 1,
                    \"Items\": [{
                        \"Id\": \"s3-origin\",
                        \"DomainName\": \"${BUCKET_DOMAIN}\",
                        \"OriginAccessControlId\": \"${OAC_ID}\",
                        \"S3OriginConfig\": {\"OriginAccessIdentity\": \"\"}
                    }]
                },
                \"CacheBehaviors\": {
                    \"Quantity\": 1,
                    \"Items\": [{
                        \"PathPattern\": \"/_next/static/*\",
                        \"TargetOriginId\": \"s3-origin\",
                        \"ViewerProtocolPolicy\": \"redirect-to-https\",
                        \"AllowedMethods\": {
                            \"Quantity\": 2,
                            \"Items\": [\"GET\", \"HEAD\"],
                            \"CachedMethods\": {\"Quantity\": 2, \"Items\": [\"GET\", \"HEAD\"]}
                        },
                        \"CachePolicyId\": \"658327ea-f89d-4fab-a63d-7e88639e58f6\",
                        \"Compress\": true
                    }]
                },
                \"DefaultCacheBehavior\": {
                    \"TargetOriginId\": \"s3-origin\",
                    \"ViewerProtocolPolicy\": \"redirect-to-https\",
                    \"AllowedMethods\": {
                        \"Quantity\": 2,
                        \"Items\": [\"GET\", \"HEAD\"],
                        \"CachedMethods\": {\"Quantity\": 2, \"Items\": [\"GET\", \"HEAD\"]}
                    },
                    \"CachePolicyId\": \"4135ea2d-6df8-44a3-9df3-4b5a84be39ad\",
                    \"Compress\": true
                },
                \"CustomErrorResponses\": {
                    \"Quantity\": 2,
                    \"Items\": [
                        {
                            \"ErrorCode\": 403,
                            \"ResponsePagePath\": \"/index.html\",
                            \"ResponseCode\": \"200\",
                            \"ErrorCachingMinTTL\": 0
                        },
                        {
                            \"ErrorCode\": 404,
                            \"ResponsePagePath\": \"/index.html\",
                            \"ResponseCode\": \"200\",
                            \"ErrorCachingMinTTL\": 0
                        }
                    ]
                },
                \"Enabled\": true,
                \"HttpVersion\": \"http2and3\",
                \"PriceClass\": \"PriceClass_200\"
            }" \
            --output json \
            | jq -r ".Distribution.Id")

        ok "CloudFront Distribution 생성 완료: ${DISTRIBUTION_ID}"

        log "S3 버킷 정책 설정 중..."
        aws s3api put-bucket-policy \
            --bucket "${FRONTEND_BUCKET}" \
            --policy "{
                \"Version\": \"2012-10-17\",
                \"Statement\": [{
                    \"Effect\": \"Allow\",
                    \"Principal\": {\"Service\": \"cloudfront.amazonaws.com\"},
                    \"Action\": \"s3:GetObject\",
                    \"Resource\": \"arn:aws:s3:::${FRONTEND_BUCKET}/*\",
                    \"Condition\": {
                        \"StringEquals\": {
                            \"AWS:SourceArn\": \"arn:aws:cloudfront::${ACCOUNT_ID}:distribution/${DISTRIBUTION_ID}\"
                        }
                    }
                }]
            }"
        ok "S3 버킷 정책 설정 완료"
    else
        ok "기존 CloudFront Distribution 사용: ${DISTRIBUTION_ID}"
    fi

    CF_DOMAIN=$(aws cloudfront get-distribution \
        --id "${DISTRIBUTION_ID}" \
        --output json \
        | jq -r ".Distribution.DomainName")

    echo "${DISTRIBUTION_ID}" > "${SCRIPT_DIR}/.cloudfront_distribution_id"
    echo "${CF_DOMAIN}"       > "${SCRIPT_DIR}/.cloudfront_domain"
}

# ──────────────────────────────────────────────
# 5. S3 업로드
# ──────────────────────────────────────────────
upload_to_s3() {
    log "정적 파일 S3 업로드 중..."

    # 1단계: JS/CSS/_next 정적 자산 먼저 업로드 (--delete 없이)
    # 구 청크를 보존해서 CloudFront 캐시가 아직 구 HTML을 서빙하는
    # 5~10분 사이에 청크 404 오류가 발생하지 않도록 한다.
    aws s3 sync "${OUT_DIR}" "s3://${FRONTEND_BUCKET}" \
        --region "${REGION}" \
        --exclude "*.html" \
        --cache-control "public, max-age=31536000, immutable"

    # 2단계: HTML 업로드 (--delete 포함)
    # 새 JS/CSS가 S3에 올라간 뒤에 HTML을 교체하므로
    # 새 HTML이 참조하는 청크가 항상 존재한다.
    aws s3 sync "${OUT_DIR}" "s3://${FRONTEND_BUCKET}" \
        --region "${REGION}" \
        --exclude "*" \
        --include "*.html" \
        --cache-control "no-cache, no-store, must-revalidate" \
        --content-type "text/html; charset=utf-8" \
        --delete

    ok "S3 업로드 완료"
}

# ──────────────────────────────────────────────
# 6. CloudFront 캐시 무효화
# ──────────────────────────────────────────────
invalidate_cloudfront() {
    DISTRIBUTION_ID=$(cat "${SCRIPT_DIR}/.cloudfront_distribution_id" 2>/dev/null || true)
    [ -n "${DISTRIBUTION_ID}" ] || return

    log "CloudFront 캐시 무효화 중..."
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id "${DISTRIBUTION_ID}" \
        --paths "/*" \
        --output json \
        | jq -r ".Invalidation.Id")
    ok "캐시 무효화 요청 완료 (ID: ${INVALIDATION_ID})"
}

# ──────────────────────────────────────────────
# 메인
# ──────────────────────────────────────────────
main() {
    echo ""
    echo "====================================================="
    echo "  Playground - Frontend Deploy"
    echo "====================================================="
    echo ""

    check_prerequisites
    load_backend_outputs
    build_frontend
    setup_frontend_bucket
    setup_cloudfront
    upload_to_s3
    invalidate_cloudfront

    CF_DOMAIN=$(cat "${SCRIPT_DIR}/.cloudfront_domain" 2>/dev/null || echo "(확인 필요)")

    echo ""
    ok "프론트엔드 배포 완료!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  웹사이트 URL: https://${CF_DOMAIN}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "※ CloudFront 배포 완료까지 약 5~10분 소요"
    echo ""
}

main "$@"
