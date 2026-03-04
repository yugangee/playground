# S3 + CloudFront 배포 가이드

## 1. 빌드

```bash
cd frontend/playground-web
npm run build
```

빌드 완료 후 `out/` 폴더가 생성됩니다.

## 2. S3 버킷 생성

1. AWS Console → S3 → 버킷 만들기
2. 버킷 이름: `playground-web` (고유한 이름)
3. 리전: `ap-northeast-2` (서울)
4. 퍼블릭 액세스 차단 해제
5. 정적 웹사이트 호스팅 활성화
   - 인덱스 문서: `index.html`
   - 오류 문서: `404.html`

## 3. S3 업로드

⚠️ `--exclude "uploads/*"` 옵션을 반드시 포함해야 합니다. 사용자가 업로드한 이미지(아바타, 클럽 엠블럼 등)가 `uploads/` 폴더에 저장되어 있으므로, `--delete` 옵션만 사용하면 이 파일들이 모두 삭제됩니다.

```bash
aws s3 sync out/ s3://playground-web-sedaily-us --delete --exclude "uploads/*"
```

## 4. S3 버킷 정책

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::playground-web/*"
    }
  ]
}
```

## 5. CloudFront 배포 생성

1. AWS Console → CloudFront → 배포 생성
2. 원본 도메인: S3 버킷 선택
3. 원본 액세스: Origin access control settings (recommended)
4. 기본 캐시 동작:
   - Viewer protocol policy: Redirect HTTP to HTTPS
   - Allowed HTTP methods: GET, HEAD, OPTIONS
5. 기본 루트 객체: `index.html`
6. 오류 페이지 설정:
   - HTTP 오류 코드: 403, 404
   - 응답 페이지 경로: `/index.html`
   - HTTP 응답 코드: 200

## 6. 배포 스크립트

`frontend/playground-web/package.json`에 추가:

```json
"scripts": {
  "deploy": "bash deploy.sh",
  "deploy:win": "deploy.bat"
}
```

배포 스크립트(`deploy.sh`, `deploy.bat`)에는 `--exclude "uploads/*"` 옵션이 포함되어 있어 사용자 업로드 파일이 보호됩니다.

## 7. 배포 실행

```bash
npm run deploy
```

## 참고사항

- CloudFront 배포 완료까지 약 15-20분 소요
- 캐시 무효화는 매월 1,000건까지 무료
- HTTPS 인증서는 ACM에서 발급 (us-east-1 리전)
- ⚠️ S3 sync 시 반드시 `--exclude "uploads/*"` 옵션을 사용할 것. 빠뜨리면 사용자가 업로드한 아바타, 클럽 엠블럼 등이 모두 삭제됨
