# JMMS Hosting on `nemnidhi.tech`

This setup serves:
- User frontend at `https://nemnidhi.tech/`
- Admin frontend at `https://nemnidhi.tech/admin/`
- Backend API behind the same domain at `https://nemnidhi.tech/api/*`

## 1) Prepare backend env

Create `backend/.env` and include at least:

```env
PORT=5200
FRONTEND_ORIGINS=https://nemnidhi.tech,https://www.nemnidhi.tech
JWT_SECRET=change_this_secret
```

Keep your WhatsApp and other production variables in the same file as needed.

## 2) Build + publish both frontends and backend

From project root:

```bash
USER_WEB_ROOT=/var/www/nemnidhi.tech/user \
ADMIN_WEB_ROOT=/var/www/nemnidhi.tech/admin \
ADMIN_APP_BASE=/admin/ \
BACKEND_PORT=5200 \
bash deploy.sh
```

Notes:
- `USER_WEB_ROOT` is for user-frontend build output.
- `ADMIN_WEB_ROOT` is for admin frontend build output.
- `ADMIN_APP_BASE` must stay `/admin/` when admin is hosted under `/admin`.

## 3) Nginx site config

Use `deploy/nginx/nemnidhi.tech.conf` as your site file:

```bash
sudo cp deploy/nginx/nemnidhi.tech.conf /etc/nginx/sites-available/nemnidhi.tech
sudo ln -s /etc/nginx/sites-available/nemnidhi.tech /etc/nginx/sites-enabled/nemnidhi.tech
sudo nginx -t
sudo systemctl reload nginx
```

## 4) SSL (recommended)

After DNS points to your server IP:

```bash
sudo certbot --nginx -d nemnidhi.tech -d www.nemnidhi.tech
```

## 5) Verify

- `https://nemnidhi.tech/` -> user portal
- `https://nemnidhi.tech/admin/` -> admin app
- `https://nemnidhi.tech/health` -> backend health

## 6) Variant: Admin on `admin.nemnidhi.tech`

If you want:
- User frontend on `https://nemnidhi.tech/`
- Admin frontend on `https://admin.nemnidhi.tech/`

Use this deploy command:

```bash
USER_WEB_ROOT=/var/www/nemnidhi.tech/user \
ADMIN_WEB_ROOT=/var/www/admin.nemnidhi.tech/admin \
ADMIN_APP_BASE=/ \
BACKEND_PORT=5200 \
bash deploy.sh
```

Use nginx config:

```bash
sudo cp deploy/nginx/nemnidhi.tech.admin-subdomain.conf /etc/nginx/sites-available/nemnidhi.tech
sudo ln -s /etc/nginx/sites-available/nemnidhi.tech /etc/nginx/sites-enabled/nemnidhi.tech
sudo nginx -t
sudo systemctl reload nginx
```

DNS requirements:
- `A` record: `nemnidhi.tech` -> server IP
- `A` record: `www.nemnidhi.tech` -> server IP
- `A` record: `admin.nemnidhi.tech` -> server IP

Optional SSL:

```bash
sudo certbot --nginx -d nemnidhi.tech -d www.nemnidhi.tech -d admin.nemnidhi.tech
```
