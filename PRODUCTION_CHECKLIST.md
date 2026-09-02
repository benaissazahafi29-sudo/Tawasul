# Production Checklist

- [ ] PostgreSQL production + automated backups
- [ ] Redis production + persistence/monitoring
- [ ] Strong JWT_SECRET and secret manager
- [ ] HTTPS only + secure cookies/tokens policy
- [ ] S3-compatible private buckets + signed URLs
- [ ] LiveKit production project and webhook validation
- [ ] OpenAI API key stored server-side
- [ ] Payment provider legally supported in target countries; webhook signature verification
- [ ] KYC/identity verification where required for withdrawals
- [ ] Cloudflare WAF/DDoS/rate limiting
- [ ] Malware scanning and content moderation pipeline
- [ ] Queue workers deployed separately from API
- [ ] Centralized logs + metrics + alerts
- [ ] Human moderation and appeals workflow
- [ ] Privacy policy, terms, age policy, data retention/deletion process
- [ ] Load tests before public launch
