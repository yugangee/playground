#!/usr/bin/env bash
# =============================================================================
# Playground - Backend Deploy Script
# AWS CDK 배포 → Lambda + DynamoDB + API Gateway + Cognito
# =============================================================================
set -euo pipefail

# ──────────────────────────────────────────────
# 설정값
# ──────────────────────────────────────────────
REGION="us-east-1"
STACK_NAME="PlaygroundStack"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="${PROJECT_ROOT}/backend"
INFRA_DIR="${BACKEND_DIR}/infra"

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
# 1. CDK 배포
# ──────────────────────────────────────────────
deploy_cdk() {
    log "CDK 의존성 설치 중..."
    cd "${BACKEND_DIR}"
    npm install --prefer-offline 2>&1 | tail -3

    log "CDK 배포 중... (약 1~3분 소요)"
    cd "${INFRA_DIR}"
    npx cdk deploy "${STACK_NAME}" --require-approval never

    ok "CDK 배포 완료"
    cd -
}

# ──────────────────────────────────────────────
# 2. Outputs 읽기 및 저장
# ──────────────────────────────────────────────
save_outputs() {
    log "스택 outputs 읽는 중..."

    STACK_OUTPUTS=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_NAME}" \
        --region "${REGION}" \
        --output json \
        | jq -r '.Stacks[0].Outputs')

    get_output() {
        echo "${STACK_OUTPUTS}" | jq -r ".[] | select(.OutputKey==\"$1\") | .OutputValue"
    }

    API_URL=$(get_output "ApiUrl")
    USER_POOL_ID=$(get_output "UserPoolId")
    USER_POOL_CLIENT_ID=$(get_output "UserPoolClientId")
    ASSETS_BUCKET=$(get_output "AssetsBucketName")

    # 프론트엔드 배포 스크립트가 읽을 수 있도록 저장
    cat > "${SCRIPT_DIR}/.backend_outputs" <<EOF
API_URL=${API_URL}
USER_POOL_ID=${USER_POOL_ID}
USER_POOL_CLIENT_ID=${USER_POOL_CLIENT_ID}
ASSETS_BUCKET=${ASSETS_BUCKET}
EOF

    ok "Outputs 저장 완료: ${SCRIPT_DIR}/.backend_outputs"
}

# ──────────────────────────────────────────────
# 메인
# ──────────────────────────────────────────────
main() {
    echo ""
    echo "====================================================="
    echo "  Playground - Backend Deploy"
    echo "====================================================="
    echo ""

    check_prerequisites
    deploy_cdk
    save_outputs

    echo ""
    ok "백엔드 배포 완료!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  API URL:              ${API_URL}"
    echo "  User Pool ID:         ${USER_POOL_ID}"
    echo "  User Pool Client ID:  ${USER_POOL_CLIENT_ID}"
    echo "  Assets Bucket:        ${ASSETS_BUCKET}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "다음 단계: bash scripts/deploy_frontend.sh"
    echo ""
}

main "$@"
