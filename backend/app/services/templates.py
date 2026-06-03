from app.core.supabase import get_supabase


def list_templates(firm_id: str) -> list[dict]:
    supabase = get_supabase()
    resp = (
        supabase.table("workflow_templates")
        .select("*")
        .or_(f"firm_id.eq.{firm_id},is_public.eq.true")
        .order("use_count", desc=True)
        .execute()
    )
    return resp.data or []


def get_template(template_id: str, firm_id: str) -> dict | None:
    supabase = get_supabase()
    resp = (
        supabase.table("workflow_templates")
        .select("*")
        .eq("id", template_id)
        .execute()
    )
    if not resp.data:
        return None
    t = resp.data[0]
    if not t.get("is_public") and t.get("firm_id") != firm_id:
        return None
    return t


def create_template(firm_id: str, user_id: str, name: str, description: str | None,
                    materia: str | None, checklist: list[dict], is_public: bool) -> dict:
    supabase = get_supabase()
    resp = supabase.table("workflow_templates").insert({
        "firm_id": firm_id,
        "name": name,
        "description": description,
        "materia": materia,
        "checklist": checklist,
        "is_public": is_public,
        "created_by": user_id,
    }).execute()
    return resp.data[0]


def clone_template(template_id: str, firm_id: str, user_id: str) -> dict:
    supabase = get_supabase()
    original = get_template(template_id, firm_id)
    if not original:
        raise ValueError("Template not found")
    resp = supabase.table("workflow_templates").insert({
        "firm_id": firm_id,
        "name": f"{original['name']} (copia)",
        "description": original.get("description"),
        "materia": original.get("materia"),
        "checklist": original["checklist"],
        "is_public": False,
        "created_by": user_id,
    }).execute()
    # Increment use_count on original
    supabase.table("workflow_templates").update(
        {"use_count": (original.get("use_count") or 0) + 1}
    ).eq("id", template_id).execute()
    return resp.data[0]


def delete_template(template_id: str, firm_id: str) -> bool:
    supabase = get_supabase()
    resp = supabase.table("workflow_templates").delete().eq("id", template_id).eq("firm_id", firm_id).execute()
    return bool(resp.data)
