import google.generativeai as genai
from app.config import get_settings

settings = get_settings()


def _get_model():
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel("gemini-1.5-flash")


def generate_grade_analysis(student_name: str, grades_data: list[dict]) -> str:
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your-gemini-api-key":
        return _mock_grade_analysis(student_name, grades_data)

    model = _get_model()
    prompt = f"""你是一位专业的教育分析师。请根据以下学生的成绩数据，生成一份详细的成绩分析报告。

学生姓名：{student_name}

成绩数据：
"""
    for g in grades_data:
        prompt += f"- {g['exam_name']} | {g['subject_name']} | 得分: {g['score']}/{g['total_score']} | 日期: {g['exam_date']}\n"

    prompt += """
请从以下方面进行分析：
1. 总体表现评价
2. 各科目优劣势分析
3. 成绩变化趋势
4. 具体改进建议
5. 学习方法推荐

请用中文输出，格式清晰，使用 Markdown 格式。"""

    response = model.generate_content(prompt)
    return response.text


def generate_class_analysis(class_name: str, grades_data: list[dict], student_count: int) -> str:
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your-gemini-api-key":
        return _mock_class_analysis(class_name, grades_data, student_count)

    model = _get_model()
    prompt = f"""你是一位专业的教育分析师。请根据以下班级的成绩数据，生成两份报告。

班级/年级：{class_name}
学生人数：{student_count}

成绩数据（格式：学生姓名 | 考试名称 | 科目 | 得分/满分）：
"""
    for g in grades_data:
        prompt += f"- {g['student_name']} | {g['exam_name']} | {g['subject_name']} | {g['score']}/{g['total_score']}\n"

    prompt += """
请生成两份报告：

## 第一部分：班级成绩分析报告
1. 班级整体成绩概况（各科平均分、最高分、最低分、及格率）
2. 各科目表现分析
3. 优秀学生和需要关注的学生
4. 成绩分布特点

## 第二部分：成绩提升计划
1. 班级薄弱学科改进方案
2. 分层教学建议（优等生/中等生/后进生）
3. 具体教学策略调整建议
4. 下阶段教学重点

请用中文输出，格式清晰，使用 Markdown 格式。"""

    response = model.generate_content(prompt)
    return response.text


def _mock_class_analysis(class_name: str, grades_data: list[dict], student_count: int) -> str:
    subjects: dict[str, list[float]] = {}
    students: dict[str, list[float]] = {}
    for g in grades_data:
        sn = g["subject_name"]
        if sn not in subjects:
            subjects[sn] = []
        subjects[sn].append(g["score"])
        st = g["student_name"]
        if st not in students:
            students[st] = []
        students[st].append(g["score"])

    report = f"# {class_name} 班级成绩分析报告\n\n"
    report += f"**学生人数：{student_count}**\n\n"

    report += "## 第一部分：班级成绩分析\n\n"
    report += "### 1. 各科目概况\n\n"
    report += "| 科目 | 平均分 | 最高分 | 最低分 | 及格率 |\n"
    report += "|------|--------|--------|--------|--------|\n"
    for subj, scores in subjects.items():
        avg = sum(scores) / len(scores)
        pass_rate = sum(1 for s in scores if s >= 60) / len(scores) * 100
        report += f"| {subj} | {avg:.1f} | {max(scores)} | {min(scores)} | {pass_rate:.0f}% |\n"

    report += "\n### 2. 学生表现\n\n"
    if students:
        student_avgs = {name: sum(s) / len(s) for name, s in students.items()}
        top3 = sorted(student_avgs.items(), key=lambda x: -x[1])[:3]
        report += "**优秀学生：**\n"
        for name, avg in top3:
            report += f"- {name}：平均 {avg:.1f} 分\n"

        bottom3 = sorted(student_avgs.items(), key=lambda x: x[1])[:3]
        report += "\n**需重点关注：**\n"
        for name, avg in bottom3:
            report += f"- {name}：平均 {avg:.1f} 分\n"

    report += "\n## 第二部分：成绩提升计划\n\n"
    if subjects:
        weakest = min(subjects.items(), key=lambda x: sum(x[1]) / len(x[1]))
        report += f"### 1. 薄弱学科\n- **{weakest[0]}** 平均分最低（{sum(weakest[1]) / len(weakest[1]):.1f}），建议增加课时和练习\n\n"

    report += "### 2. 分层教学建议\n"
    report += "- **优等生**：拓展提高题，培养自主学习能力\n"
    report += "- **中等生**：强化基础训练，突破薄弱知识点\n"
    report += "- **后进生**：一对一辅导，从基础题抓起\n\n"
    report += "### 3. 下阶段重点\n"
    report += "- 加强薄弱科目的教学\n- 定期进行小测验跟踪进步\n- 组织学习小组互助\n\n"
    report += "> *注：当前为模拟分析报告。配置 Gemini API Key 后将生成 AI 分析报告。*\n"
    return report


def generate_paper_analysis(file_content: bytes, subject: str) -> str:
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your-gemini-api-key":
        return _mock_paper_analysis(subject)

    model = _get_model()
    prompt = f"""你是一位专业的{subject}教师。请分析这份试卷，提供以下信息：
1. 试卷难度评估
2. 知识点覆盖分析
3. 题型分布
4. 重点考查方向
5. 备考建议

请用中文输出，格式清晰，使用 Markdown 格式。"""

    response = model.generate_content([prompt, {"mime_type": "image/jpeg", "data": file_content}])
    return response.text


def _mock_grade_analysis(student_name: str, grades_data: list[dict]) -> str:
    subjects = {}
    for g in grades_data:
        name = g["subject_name"]
        if name not in subjects:
            subjects[name] = []
        subjects[name].append(g["score"])

    report = f"# {student_name} 成绩分析报告\n\n"
    report += "## 1. 总体表现\n\n"

    all_scores = [g["score"] for g in grades_data]
    if all_scores:
        avg = sum(all_scores) / len(all_scores)
        report += f"- 平均成绩：**{avg:.1f}** 分\n"
        report += f"- 最高成绩：**{max(all_scores)}** 分\n"
        report += f"- 最低成绩：**{min(all_scores)}** 分\n\n"

    report += "## 2. 各科目分析\n\n"
    for subj, scores in subjects.items():
        avg = sum(scores) / len(scores)
        trend = "上升" if len(scores) > 1 and scores[-1] > scores[0] else "下降" if len(scores) > 1 and scores[-1] < scores[0] else "稳定"
        report += f"### {subj}\n- 平均分：{avg:.1f}\n- 趋势：{trend}\n- 考试次数：{len(scores)}\n\n"

    report += "## 3. 改进建议\n\n"
    if subjects:
        weakest = min(subjects.items(), key=lambda x: sum(x[1]) / len(x[1]))
        report += f"- 重点加强 **{weakest[0]}** 的学习\n"
    report += "- 建议制定每日学习计划\n- 多做历年真题练习\n- 注意查漏补缺\n\n"
    report += "> *注：当前为模拟分析报告。配置 Gemini API Key 后将生成 AI 分析报告。*\n"
    return report


def _mock_paper_analysis(subject: str) -> str:
    return f"""# {subject} 试卷分析报告

## 1. 难度评估
本试卷整体难度适中，基础题占60%，提高题占30%，拔高题占10%。

## 2. 知识点覆盖
覆盖了本学期主要知识点，分布较为均匀。

## 3. 题型分布
- 选择题：40%
- 填空题：20%
- 解答题：40%

## 4. 备考建议
- 夯实基础知识
- 多做专项练习
- 注意时间管理

> *注：当前为模拟分析报告。配置 Gemini API Key 后将生成 AI 分析报告。*
"""
