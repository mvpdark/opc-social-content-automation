# Cloudflare Tunnel for `opc.mvpdark.top`

This project is prepared to run behind one Cloudflare Tunnel hostname:

- Public URL: `https://opc.mvpdark.top`
- Frontend local service: `http://localhost:3000`
- Backend API local service: `http://localhost:8010`
- Backend static assets: `http://localhost:8010/static`

Cloudflare Tunnel publishes local applications without opening router ports. Cloudflare documents this as a public hostname mapping from a domain to a local service, and `cloudflared` ingress rules can match by hostname and path.

## 1. Start Local Services

From the project root:

```powershell
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8010
```

In a second terminal:

```powershell
cd frontend
npm run dev:lan
```

Local checks:

```powershell
Invoke-WebRequest http://127.0.0.1:8010/health
Invoke-WebRequest http://127.0.0.1:3000/?terminal=pc
```

## 2. Create A Cloudflare Tunnel

Install `cloudflared` from Cloudflare, then authenticate:

```powershell
cloudflared tunnel login
cloudflared tunnel create opc-social-content-automation
```

Create the DNS route:

```powershell
cloudflared tunnel route dns opc-social-content-automation opc.mvpdark.top
```

## 3. Configure Ingress

Copy `infra/cloudflare/opc-tunnel.example.yml` to your cloudflared config path and replace:

- `REPLACE_WITH_TUNNEL_ID`
- `C:\Users\YOUR_USER\.cloudflared\REPLACE_WITH_TUNNEL_ID.json`

Ingress rules must keep this order:

1. `opc.mvpdark.top/api` -> backend `8010`
2. `opc.mvpdark.top/static` -> backend `8010`
3. all other `opc.mvpdark.top` paths -> frontend `3000`
4. final catch-all `http_status:404`

Validate:

```powershell
cloudflared tunnel ingress validate
cloudflared tunnel ingress rule https://opc.mvpdark.top/api/health
cloudflared tunnel ingress rule https://opc.mvpdark.top/
```

## 4. Run The Tunnel

```powershell
cloudflared tunnel run opc-social-content-automation
```

Open:

```text
https://opc.mvpdark.top
```

Mobile users should automatically enter the Android workspace. Desktop users should stay on the PC workspace.

## Notes

- The frontend uses the current public hostname for API requests on non-local domains, so `https://opc.mvpdark.top` calls `https://opc.mvpdark.top/api`.
- Local and LAN addresses still call port `8010` directly, for example `http://192.168.10.88:8010/api`.
- Do not expose raw API keys in Cloudflare Workers or public frontend code. Keys stay in the backend `.env` or are applied through the local settings page during testing.
