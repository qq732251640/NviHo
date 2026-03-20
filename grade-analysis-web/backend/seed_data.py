"""Seed database with initial region and subject data."""
from app.database import SessionLocal, engine, Base
from app.models.region import Region
from app.models.subject import Subject
from app.models.school import School
from app.models.user import User
from app.models.grade import Grade
from app.models.exam_paper import ExamPaper
from app.models.analysis_report import AnalysisReport

Base.metadata.create_all(bind=engine)

REGIONS = {
    "北京市": {"北京市": ["东城区", "西城区", "朝阳区", "海淀区", "丰台区", "石景山区", "通州区", "顺义区"]},
    "上海市": {"上海市": ["黄浦区", "徐汇区", "长宁区", "静安区", "普陀区", "虹口区", "杨浦区", "浦东新区", "闵行区"]},
    "广东省": {
        "广州市": ["天河区", "越秀区", "海珠区", "荔湾区", "白云区", "番禺区"],
        "深圳市": ["福田区", "罗湖区", "南山区", "宝安区", "龙岗区", "龙华区"],
        "东莞市": ["莞城街道", "南城街道", "东城街道", "万江街道"],
    },
    "浙江省": {
        "杭州市": ["上城区", "下城区", "西湖区", "江干区", "拱墅区", "滨江区", "余杭区"],
        "宁波市": ["海曙区", "江北区", "北仑区", "鄞州区"],
        "温州市": ["鹿城区", "龙湾区", "瓯海区"],
    },
    "江苏省": {
        "南京市": ["玄武区", "秦淮区", "建邺区", "鼓楼区", "浦口区", "栖霞区"],
        "苏州市": ["姑苏区", "虎丘区", "吴中区", "相城区", "吴江区"],
        "无锡市": ["锡山区", "惠山区", "滨湖区", "梁溪区"],
    },
    "四川省": {
        "成都市": ["锦江区", "青羊区", "金牛区", "武侯区", "成华区", "龙泉驿区"],
        "绵阳市": ["涪城区", "游仙区", "安州区"],
    },
    "湖北省": {
        "武汉市": ["江岸区", "江汉区", "硚口区", "汉阳区", "武昌区", "洪山区"],
        "宜昌市": ["西陵区", "伍家岗区", "点军区"],
    },
    "山东省": {
        "济南市": ["历下区", "市中区", "槐荫区", "天桥区", "历城区"],
        "青岛市": ["市南区", "市北区", "黄岛区", "崂山区", "李沧区"],
    },
    "河南省": {
        "郑州市": ["中原区", "二七区", "管城回族区", "金水区", "上街区", "惠济区"],
        "洛阳市": ["老城区", "西工区", "瀍河回族区", "涧西区"],
    },
    "湖南省": {
        "长沙市": ["芙蓉区", "天心区", "岳麓区", "开福区", "雨花区", "望城区"],
        "株洲市": ["荷塘区", "芦淞区", "石峰区", "天元区"],
    },
}

SUBJECTS = {
    "elementary": ["语文", "数学", "英语", "科学", "道德与法治", "体育", "音乐", "美术"],
    "middle": ["语文", "数学", "英语", "物理", "化学", "生物", "历史", "地理", "道德与法治", "体育"],
    "high": ["语文", "数学", "英语", "物理", "化学", "生物", "历史", "地理", "政治", "体育"],
}


def seed():
    db = SessionLocal()
    try:
        if db.query(Region).count() > 0:
            print("数据已存在，跳过种子数据")
            return

        print("开始导入区域数据...")
        for prov_name, cities in REGIONS.items():
            prov = Region(name=prov_name, level="province", parent_id=None)
            db.add(prov)
            db.flush()

            for city_name, districts in cities.items():
                city = Region(name=city_name, level="city", parent_id=prov.id)
                db.add(city)
                db.flush()

                for dist_name in districts:
                    dist = Region(name=dist_name, level="district", parent_id=city.id)
                    db.add(dist)

        print("开始导入科目数据...")
        for level, subjects in SUBJECTS.items():
            for subj_name in subjects:
                db.add(Subject(name=subj_name, grade_level=level))

        db.commit()
        print("种子数据导入完成!")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
