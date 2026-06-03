import logging
import httpx
from app.core.config import get_settings

logger = logging.getLogger(__name__)

_FROM = "LEXIA <noreply@lexia.com.ar>"
_RESEND_URL = "https://api.resend.com/emails"

_BASE_HTML = """
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><style>
  body {{ background:#0A1628; color:#F0EDE8; font-family:'IBM Plex Sans',sans-serif; margin:0; padding:0; }}
  .wrap {{ max-width:560px; margin:40px auto; background:#1A2F4A; border:1px solid rgba(201,168,76,.15); border-radius:8px; padding:40px; }}
  .logo {{ color:#C9A84C; font-size:22px; font-weight:700; letter-spacing:-.02em; margin-bottom:32px; }}
  h1 {{ color:#F0EDE8; font-size:22px; margin:0 0 16px; }}
  p {{ color:#9BA8BC; font-size:14px; line-height:1.7; margin:0 0 16px; }}
  .btn {{ display:inline-block; background:#C9A84C; color:#0A1628; padding:12px 28px; border-radius:6px;
          font-weight:600; font-size:13px; text-decoration:none; text-transform:uppercase;
          letter-spacing:.08em; margin:8px 0 24px; }}
  .foot {{ color:#5C6B82; font-size:12px; border-top:1px solid rgba(201,168,76,.1); padding-top:20px; margin-top:32px; }}
</style></head>
<body><div class="wrap">
  <div class="logo">LEXIA</div>
  {body}
  <div class="foot">LEXIA — Plataforma Legal IA para estudios jurídicos argentinos</div>
</div></body></html>
"""


async def _send(to: str, subject: str, body_html: str) -> None:
    settings = get_settings()
    if not settings.resend_api_key:
        logger.warning('{"step":"email_skip","to":"%s","reason":"no_api_key"}', to)
        return
    html = _BASE_HTML.format(body=body_html)
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            _RESEND_URL,
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json={"from": _FROM, "to": to, "subject": subject, "html": html},
        )
        if resp.status_code >= 400:
            logger.error('{"step":"email_error","status":%d,"body":"%s"}', resp.status_code, resp.text[:200])


async def send_verification_email(to: str, token: str, firm_name: str) -> None:
    verify_url = f"https://app.lexia.com.ar/verify?token={token}"
    body = f"""
    <h1>Verificá tu email</h1>
    <p>Gracias por registrar <strong>{firm_name}</strong> en LEXIA.</p>
    <p>Hacé click en el botón para confirmar tu dirección de email y activar tu cuenta.</p>
    <a class="btn" href="{verify_url}">Verificar email</a>
    <p>Este enlace expira en 24 horas. Si no creaste esta cuenta, ignorá este mensaje.</p>
    """
    await _send(to, "Verificá tu email — LEXIA", body)


async def send_welcome_email(to: str, firm_name: str) -> None:
    body = f"""
    <h1>Bienvenido a LEXIA</h1>
    <p>Tu estudio <strong>{firm_name}</strong> ya está activo.</p>
    <p>Tu período de prueba incluye 20 documentos y 100 consultas por mes.
    Podés subir documentos, crear causas y hacer consultas en lenguaje natural
    sobre toda tu base documental.</p>
    <a class="btn" href="https://app.lexia.com.ar/dashboard">Ir al dashboard</a>
    <p>Si tenés preguntas, respondé este email y te ayudamos.</p>
    """
    await _send(to, "Bienvenido a LEXIA — Tu cuenta está activa", body)


async def send_alert_email(to: str, firm_name: str, alerts: list[dict]) -> None:
    items = "".join(
        f"<p><strong>{a.get('title','')}</strong><br>"
        f"<span style='color:#9BA8BC;font-size:13px'>{a.get('source','').upper()} · {a.get('published_at','')[:10]}</span></p>"
        for a in alerts[:5]
    )
    body = f"""
    <h1>Novedades de normativa</h1>
    <p>Hay {len(alerts)} actualizacion{'es' if len(alerts)>1 else ''} de normativa que puede{'n' if len(alerts)>1 else ''} afectar causas de <strong>{firm_name}</strong>:</p>
    {items}
    <a class="btn" href="https://app.lexia.com.ar/alerts">Ver alertas</a>
    """
    await _send(to, f"[LEXIA] {len(alerts)} nueva{'s' if len(alerts)>1 else ''} alerta{'s' if len(alerts)>1 else ''} de normativa", body)


async def send_deadline_email(to: str, firm_name: str, deadlines: list[dict]) -> None:
    items = "".join(
        f"<p><strong>{d.get('description','')}</strong><br>"
        f"<span style='color:#F59E0B;font-size:13px'>Vence: {d.get('due_date','')}</span></p>"
        for d in deadlines[:5]
    )
    body = f"""
    <h1>Plazos próximos a vencer</h1>
    <p>Recordatorio de plazos próximos para <strong>{firm_name}</strong>:</p>
    {items}
    <a class="btn" href="https://app.lexia.com.ar/matters">Ver causas</a>
    """
    await _send(to, f"[LEXIA] Plazos próximos — {firm_name}", body)
