"""初始化数据:品类字典 + 10 位示例摄影师 + 作品 + 套餐 + 档期。

用法:
    cd backend
    source venv/bin/activate
    python seed_data.py
"""
import random
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.db_migrate import run_migrations  # noqa: E402
from app.models import (  # noqa: E402
    Category,
    Package,
    Photographer,
    Schedule,
    User,
    Work,
)
from app.utils.security import hash_password  # noqa: E402


CATEGORIES = [
    ("wedding", "婚礼", "💍", 1),
    ("engagement", "订婚", "💝", 2),
    ("birthday", "生日", "🎂", 3),
    ("portrait", "写真", "👰", 4),
    ("family", "全家福", "👨‍👩‍👧", 5),
    ("kids", "儿童", "👶", 6),
    ("maternity", "孕妇", "🤰", 7),
    ("business", "商务", "💼", 8),
    ("follow", "跟拍", "📸", 9),
    ("graduation", "毕业季", "🎓", 10),
]

DEMO_PHOTOGRAPHERS = [
    {
        "username": "lunar_photo",
        "nickname": "路明摄影",
        "intro": "10 年婚礼跟拍经验,擅长自然光与情绪捕捉,作品风格简洁干净。",
        "categories": ["wedding", "engagement", "follow"],
        "starting_price": 59900,
        "rating": 4.9,
        "review_count": 128,
        "completed_orders": 156,
        "external_portfolio_url": "https://example.com/timebox/luming",
    },
    {
        "username": "dawn_studio",
        "nickname": "晨光工作室",
        "intro": "亲子写真专门户,擅长引导孩子的真实笑容,工作室温馨舒适。",
        "categories": ["kids", "family", "maternity"],
        "starting_price": 29900,
        "rating": 4.8,
        "review_count": 96,
        "completed_orders": 110,
    },
    {
        "username": "lens_zhao",
        "nickname": "赵镜头",
        "intro": "户外婚纱摄影师,常驻太原及周边山区,作品色调清新文艺。",
        "categories": ["wedding", "portrait"],
        "starting_price": 39900,
        "rating": 4.7,
        "review_count": 73,
        "completed_orders": 81,
    },
    {
        "username": "li_birthday",
        "nickname": "李生日小哥",
        "intro": "生日宴会与小型聚会跟拍,出片快,3 天内交付。",
        "categories": ["birthday", "follow"],
        "starting_price": 19900,
        "rating": 4.9,
        "review_count": 201,
        "completed_orders": 245,
    },
    {
        "username": "ms_wang",
        "nickname": "王小姐写真馆",
        "intro": "古风写真+汉服跟拍,提供妆造一条龙服务。",
        "categories": ["portrait"],
        "starting_price": 49900,
        "rating": 4.6,
        "review_count": 58,
        "completed_orders": 64,
    },
    {
        "username": "biz_chen",
        "nickname": "陈商务",
        "intro": "商务活动 / 年会 / 论坛跟拍,直出 RAW 文件,可签保密协议。",
        "categories": ["business"],
        "starting_price": 89900,
        "rating": 4.8,
        "review_count": 36,
        "completed_orders": 41,
    },
    {
        "username": "sunny_ma",
        "nickname": "马日光",
        "intro": "户外亲子+毕业季摄影,擅长大场景和团体合影。",
        "categories": ["family", "graduation"],
        "starting_price": 24900,
        "rating": 4.7,
        "review_count": 88,
        "completed_orders": 102,
    },
    {
        "username": "yang_engagement",
        "nickname": "杨订婚专项",
        "intro": "山西本地订婚仪式跟拍,熟悉本地风俗流程。",
        "categories": ["engagement", "wedding"],
        "starting_price": 34900,
        "rating": 4.9,
        "review_count": 47,
        "completed_orders": 52,
    },
    {
        "username": "studio_zhou",
        "nickname": "周影像",
        "intro": "孕妇写真+新生儿摄影,温和耐心,工作室经过专业婴儿安全培训。",
        "categories": ["maternity", "kids"],
        "starting_price": 39900,
        "rating": 5.0,
        "review_count": 22,
        "completed_orders": 24,
    },
    {
        "username": "zhang_quick",
        "nickname": "张快门",
        "intro": "生日 / 满月 / 百日宴跟拍,价格亲民,服务范围太原+晋中。",
        "categories": ["birthday", "follow", "kids"],
        "starting_price": 14900,
        "rating": 4.6,
        "review_count": 134,
        "completed_orders": 162,
    },
]

DEMO_PACKAGES_TPL = {
    "wedding": [
        ("半日跟拍 4h", 4, 80, 59900, "婚礼仪式 / 接亲 / 主桌敬酒,单机位"),
        ("全日跟拍 8h", 8, 200, 99900, "全程纪实+精修,双机位"),
    ],
    "engagement": [
        ("订婚仪式跟拍", 4, 60, 39900, "订婚流程全记录,含家族合影"),
    ],
    "portrait": [
        ("写真基础版", 3, 30, 49900, "服装 1 套,精修 30 张"),
        ("写真升级版", 5, 80, 89900, "服装 3 套,妆造跟妆"),
    ],
    "kids": [
        ("儿童写真", 2, 30, 29900, "工作室或户外二选一"),
    ],
    "family": [
        ("全家福套餐", 2, 30, 24900, "支持外景或工作室"),
    ],
    "maternity": [
        ("孕妇写真", 3, 30, 39900, "工作室,含简单妆造"),
    ],
    "birthday": [
        ("生日宴跟拍", 3, 50, 19900, "生日蛋糕 + 切蛋糕 + 互动游戏"),
    ],
    "business": [
        ("商务活动 4h", 4, 100, 89900, "会议 / 论坛 / 颁奖,直出 RAW"),
    ],
    "follow": [
        ("一日跟拍", 6, 100, 39900, "生活方式跟拍,情侣/朋友/家庭"),
    ],
    "graduation": [
        ("毕业季写真", 3, 50, 24900, "校园场景,5 人成团享 8 折"),
    ],
}

# 占位作品图(picsum.photos 国内稳定,演示用)
# 生产环境运营会通过后台上传到京东云 OSS,替换这些占位图
DEMO_IMAGES = [
    f"https://picsum.photos/seed/photographer{i}/900/1200"
    for i in range(1, 21)
]


def seed():
    Base.metadata.create_all(bind=engine)
    run_migrations()
    db = SessionLocal()

    if db.query(Category).count() == 0:
        for code, name, icon, sort in CATEGORIES:
            db.add(Category(code=code, name=name, icon=icon, sort=sort))
        db.commit()
        print(f"[seed] 创建 {len(CATEGORIES)} 个品类")

    cat_by_code = {c.code: c for c in db.query(Category).all()}

    admin_user = db.query(User).filter(User.username == "admin").first()
    if not admin_user:
        admin_user = User(
            username="admin",
            password_hash=hash_password("admin"),
            nickname="平台管理员",
            pm_role="admin",
        )
        db.add(admin_user)
        db.commit()
        print("[seed] 创建管理员账号 admin / admin")

    for d in DEMO_PHOTOGRAPHERS:
        if db.query(User).filter(User.username == d["username"]).first():
            continue

        user = User(
            username=d["username"],
            password_hash=hash_password("123456"),
            nickname=d["nickname"],
            avatar=DEMO_IMAGES[random.randint(0, len(DEMO_IMAGES) - 1)],
            pm_role="photographer",
            pm_phone="13800000000",
            pm_city="太原",
        )
        db.add(user)
        db.flush()

        pgr = Photographer(
            user_id=user.id,
            nickname=d["nickname"],
            avatar=user.avatar,
            cover_image=DEMO_IMAGES[random.randint(0, len(DEMO_IMAGES) - 1)],
            intro=d["intro"],
            base_city="太原",
            service_radius_km=50,
            avg_rating=d["rating"],
            review_count=d["review_count"],
            completed_orders=d["completed_orders"],
            starting_price=d["starting_price"],
            hot_score=d["completed_orders"] * 5 + (d["rating"] - 3) * d["review_count"] * 2,
            external_portfolio_url=d.get("external_portfolio_url"),
            contact_phone="13800000000",
            status="approved",
            years_of_experience=random.randint(2, 12),
        )
        pgr.categories = [cat_by_code[c] for c in d["categories"] if c in cat_by_code]
        db.add(pgr)
        db.flush()

        for code in d["categories"]:
            for tpl in DEMO_PACKAGES_TPL.get(code, []):
                name, hours, photos, price, desc = tpl
                db.add(
                    Package(
                        photographer_id=pgr.id,
                        category_id=cat_by_code[code].id,
                        name=name,
                        duration_hours=hours,
                        photos_count=photos,
                        price=price,
                        description=desc,
                        is_active=1,
                    )
                )

        for i in range(random.randint(8, 12)):
            cat_code = random.choice(d["categories"])
            db.add(
                Work(
                    photographer_id=pgr.id,
                    category_id=cat_by_code[cat_code].id,
                    image_url=DEMO_IMAGES[i % len(DEMO_IMAGES)],
                    thumb_url=DEMO_IMAGES[i % len(DEMO_IMAGES)],
                    title=None,
                    is_cover=1 if i == 0 else 0,
                    sort=100 - i,
                    shoot_date=datetime.now() - timedelta(days=random.randint(0, 365)),
                )
            )

        today = date.today()
        for i in range(60):
            day = today + timedelta(days=i)
            status_pool = ["free", "free", "free", "partial", "busy", "blocked"]
            db.add(
                Schedule(
                    photographer_id=pgr.id,
                    date=day,
                    status=random.choice(status_pool),
                )
            )

    db.commit()
    print(f"[seed] 已创建 {len(DEMO_PHOTOGRAPHERS)} 位示例摄影师及作品/套餐/档期")

    db.close()


if __name__ == "__main__":
    seed()
