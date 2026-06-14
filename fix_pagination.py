import re

with open(r'd:\EndUser\hitesh\shreshtproject\shreshtibrary\api\v1\v2_admin.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update _paginate definition
new_paginate_def = """def _paginate(request, rows, serializer=None):
    page = max(int(request.query_params.get("page", 1)), 1)
    page_size = min(max(int(request.query_params.get("page_size", 20)), 1), 100)
    count = rows.count() if hasattr(rows, "count") else len(rows)
    start = (page - 1) * page_size
    end = start + page_size
    total_pages = (count + page_size - 1) // page_size
    page_items = rows[start:end]
    data = [serializer(item) for item in page_items] if serializer else (page_items if isinstance(page_items, list) else list(page_items))
    return Response({
        "success": True,
        "count": count,
        "total_pages": total_pages,
        "current_page": page,
        "next": None if page >= total_pages else f"?page={page + 1}&page_size={page_size}",
        "previous": None if page <= 1 else f"?page={page - 1}&page_size={page_size}",
        "data": data,
    })"""

content = re.sub(
    r'def _paginate\(request, rows\):[\s\S]*?    \}\)',
    new_paginate_def,
    content,
    count=1
)

# 2. Update usages
content = content.replace(
    "return _paginate(request, [serialize_student(profile) for profile in qs])",
    "return _paginate(request, qs, serialize_student)"
)
content = content.replace(
    "return _paginate(request, [serialize_membership(item) for item in qs])",
    "return _paginate(request, qs, serialize_membership)"
)
content = content.replace(
    'return _paginate(request, [serialize_qr(qr) for qr in QRCode.objects.all().order_by("-created_at")])',
    'return _paginate(request, QRCode.objects.all().order_by("-created_at"), serialize_qr)'
)
content = content.replace(
    "return _paginate(request, [serialize_attendance(item) for item in qs])",
    "return _paginate(request, qs, serialize_attendance)"
)
content = content.replace(
    "return _paginate(request, [serialize_payment(item) for item in qs])",
    "return _paginate(request, qs, serialize_payment)"
)
content = content.replace(
    "return _paginate(request, [serialize_seat(seat) for seat in seats])",
    "return _paginate(request, seats, serialize_seat)"
)
content = content.replace(
    'return _paginate(request, [serialize_notification(item) for item in Notification.objects.all().order_by("-created_at")])',
    'return _paginate(request, Notification.objects.all().order_by("-created_at"), serialize_notification)'
)

with open(r'd:\EndUser\hitesh\shreshtproject\shreshtibrary\api\v1\v2_admin.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Pagination fixed in v2_admin.py")
