# SSM local setup

## 1) IAM user (local)

- Crie um usuario IAM (ex: `chama-ssm-local`).
- Anexe a policy minima:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadChamaParam",
      "Effect": "Allow",
      "Action": ["ssm:GetParameter"],
      "Resource": "arn:aws:ssm:us-east-2:222984221398:parameter/chamanoespeto/prod"
    },
    {
      "Sid": "DecryptParam",
      "Effect": "Allow",
      "Action": ["kms:Decrypt"],
      "Resource": "*"
    }
  ]
}
```

- Gere Access Key + Secret.

## 2) AWS CLI

```bash
aws configure
```

Preencha:
- Default region: `us-east-2`
- Output: `json`

## 3) Backend local

Crie/edite `backend/.env`:

```
SSM_PARAMETER_NAME=/chamanoespeto/prod
AWS_REGION=us-east-2
SSM_OVERRIDE=true
SSM_LOCAL_DB_HOST=localhost
```

> Se usar Docker Compose, `SSM_LOCAL_DB_HOST` pode ficar vazio.

Suba:

```bash
cd backend
npm run dev
```

## 4) Verificar

```bash
aws ssm get-parameter --name /chamanoespeto/prod --with-decryption --region us-east-2
```

No log da API:
- `SSM env loaded` (com `parameter`, `keys`, `applied`, `overrides`).
