# EC2 인스턴스 비용 정리

## 현재 사용 중: g4dn.2xlarge

### 스펙
- GPU: NVIDIA T4 (16GB)
- vCPU: 8개
- 메모리: 32GB
- 용도: 영상 분석 (YOLO 객체 탐지)

### 비용
- **시간당:** $0.752 (약 1,050원)
- **하루 24시간:** $18.05 (약 25,000원)
- **한 달 (30일):** $541.44 (약 756,000원)

---

## 이전 사용: g4dn.xlarge

### 스펙
- GPU: NVIDIA T4 (16GB)
- vCPU: 4개
- 메모리: 16GB

### 비용
- **시간당:** $0.526 (약 735원)
- **하루 24시간:** $12.62 (약 17,600원)
- **한 달 (30일):** $378.72 (약 529,000원)

---

## 비용 절감 방법

1. **사용 후 즉시 중지**
   - 영상 분석 완료 후 인스턴스 중지
   - 중지 상태에서는 컴퓨팅 비용 없음 (EBS 스토리지 비용만 약 $10/월)

2. **자동 중지 설정**
   - 5분 이상 활동 없으면 자동 종료
   - 현재는 비활성화 상태

3. **필요 시에만 시작**
   - 프론트엔드에서 자동 시작 기능 사용
   - `ensureEC2.ts`가 필요할 때만 인스턴스 시작

---

## 영상 분석 예상 비용

### g4dn.2xlarge 기준
- **1분 영상:** 약 2-3분 소요 → $0.025-0.038 (약 35-53원)
- **5분 영상:** 약 10-15분 소요 → $0.125-0.188 (약 175-260원)
- **10분 영상:** 약 20-30분 소요 → $0.25-0.375 (약 350-520원)

### 참고
- 영상 분석 자체에 추가 비용 없음
- 인스턴스 실행 시간만큼만 과금
- 분석 완료 후 인스턴스 중지 필수

---

## 추가 비용

### EBS 스토리지
- 약 $0.10/GB/월
- 인스턴스 중지 상태에서도 과금
- 현재 100GB 사용 시 약 $10/월

### 데이터 전송
- 인터넷 아웃바운드: $0.09/GB (첫 10TB)
- 인바운드: 무료

### S3 스토리지
- 영상 저장: $0.023/GB/월
- 요청 비용: PUT $0.005/1000건, GET $0.0004/1000건

---

## 인스턴스 관리 명령어

### 중지
```bash
aws ec2 stop-instances --instance-ids i-03dfdfeb95b7a281a --region us-east-1
```

### 시작
```bash
aws ec2 start-instances --instance-ids i-03dfdfeb95b7a281a --region us-east-1
```

### 상태 확인
```bash
aws ec2 describe-instances --instance-ids i-03dfdfeb95b7a281a --region us-east-1 --query 'Reservations[0].Instances[0].State.Name'
```

### 인스턴스 타입 변경
```bash
# 1. 중지
aws ec2 stop-instances --instance-ids i-03dfdfeb95b7a281a --region us-east-1
aws ec2 wait instance-stopped --instance-ids i-03dfdfeb95b7a281a --region us-east-1

# 2. 타입 변경
aws ec2 modify-instance-attribute --instance-id i-03dfdfeb95b7a281a --instance-type g4dn.xlarge --region us-east-1

# 3. 시작
aws ec2 start-instances --instance-ids i-03dfdfeb95b7a281a --region us-east-1
```
