import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Canvas, Picker } from '@tarojs/components';
import { gradeApi, analysisApi } from '../../api';

interface SubjectRate {
  name: string;
  score: number;
  total_score: number;
  rate: number;
}

interface DistItem {
  range_label: string;
  subjects: string[];
  count: number;
}

const CATEGORY_COLORS: Record<string, { color: string; tag: string }> = {
  '优秀': { color: '#52c41a', tag: 'tag-green' },
  '良好': { color: '#1890ff', tag: 'tag-blue' },
  '中等': { color: '#faad14', tag: 'tag-gold' },
  '及格': { color: '#722ed1', tag: 'tag-purple' },
  '不及格': { color: '#ff4d4f', tag: 'tag-red' },
};

function getCategory(rate: number): string {
  if (rate >= 90) return '优秀';
  if (rate >= 80) return '良好';
  if (rate >= 70) return '中等';
  if (rate >= 60) return '及格';
  return '不及格';
}

const PIE_SEGMENTS = [
  { label: '90-100 优秀', key: '优秀', color: '#52c41a' },
  { label: '80-89 良好', key: '良好', color: '#1890ff' },
  { label: '70-79 中等', key: '中等', color: '#faad14' },
  { label: '60-69 及格', key: '及格', color: '#722ed1' },
  { label: '0-59 不及格', key: '不及格', color: '#ff4d4f' },
];

export default function StudentComparison() {
  const [grades, setGrades] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [examIdx, setExamIdx] = useState(0);
  const [distribution, setDistribution] = useState<DistItem[]>([]);

  useEffect(() => {
    gradeApi.getMyGrades().then((res: any) => setGrades(Array.isArray(res) ? res : []));
    analysisApi.listExams().then((res: any) => setExams(Array.isArray(res) ? res : []));
  }, []);

  const examName = exams[examIdx]?.exam_name;

  useEffect(() => {
    if (!examName) return;
    analysisApi.getMyDistribution(examName).then((res: any) => {
      setDistribution(Array.isArray(res) ? res : []);
    });
  }, [examName]);

  const examGrades = examName ? grades.filter((g: any) => g.exam_name === examName) : [];
  const subjects: SubjectRate[] = examGrades.map((g: any) => ({
    name: g.subject_name,
    score: g.score,
    total_score: g.total_score,
    rate: g.total_score > 0 ? (g.score / g.total_score) * 100 : 0,
  }));

  const totalScore = subjects.reduce((s, i) => s + i.score, 0);
  const avgRate = subjects.length > 0
    ? subjects.reduce((s, i) => s + i.rate, 0) / subjects.length
    : 0;
  const sorted = [...subjects].sort((a, b) => b.rate - a.rate);
  const best = sorted[0] ?? null;
  const worst = sorted[sorted.length - 1] ?? null;

  // ---------- Radar chart ----------
  useEffect(() => {
    if (subjects.length < 3) return;

    const ctx = Taro.createCanvasContext('compRadar');
    const W = 340, H = 220;
    const cx = W / 2, cy = H / 2;
    const maxR = 80;
    const n = subjects.length;
    const step = (Math.PI * 2) / n;

    ctx.setFillStyle('#fff');
    ctx.fillRect(0, 0, W, H);

    [20, 40, 60, 80, 100].forEach(level => {
      const r = (level / 100) * maxR;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const angle = -Math.PI / 2 + step * (i % n);
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.setStrokeStyle(level === 100 ? '#ddd' : '#f0f0f0');
      ctx.setLineWidth(0.5);
      ctx.stroke();
    });

    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + step * i;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + maxR * Math.cos(angle), cy + maxR * Math.sin(angle));
      ctx.setStrokeStyle('#e8e8e8');
      ctx.setLineWidth(0.5);
      ctx.stroke();
    }

    ctx.beginPath();
    subjects.forEach((s, i) => {
      const angle = -Math.PI / 2 + step * i;
      const r = (Math.min(s.rate, 100) / 100) * maxR;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.setGlobalAlpha(0.25);
    ctx.setFillStyle('#722ed1');
    ctx.fill();
    ctx.setGlobalAlpha(1);
    ctx.setStrokeStyle('#722ed1');
    ctx.setLineWidth(1.5);
    ctx.stroke();

    subjects.forEach((s, i) => {
      const angle = -Math.PI / 2 + step * i;
      const r = (Math.min(s.rate, 100) / 100) * maxR;
      const dx = cx + r * Math.cos(angle);
      const dy = cy + r * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(dx, dy, 2.5, 0, Math.PI * 2);
      ctx.setFillStyle('#722ed1');
      ctx.fill();

      const lx = cx + (maxR + 16) * Math.cos(angle);
      const ly = cy + (maxR + 16) * Math.sin(angle);
      ctx.setTextAlign('center');
      ctx.setFillStyle('#333');
      ctx.setFontSize(8);
      ctx.fillText(s.name, lx, ly - 3);
      ctx.setFillStyle('#722ed1');
      ctx.setFontSize(7);
      ctx.fillText(`${s.rate.toFixed(0)}%`, lx, ly + 7);
    });

    ctx.setTextAlign('center');
    ctx.setFillStyle('#333');
    ctx.setFontSize(16);
    ctx.fillText(String(totalScore), cx, cy + 4);
    ctx.setFillStyle('#999');
    ctx.setFontSize(7);
    ctx.fillText('总分', cx, cy + 14);

    ctx.draw();
  }, [grades, exams, examIdx]);

  // ---------- Pie / ring chart ----------
  useEffect(() => {
    if (distribution.length === 0) return;

    const reversed = [...distribution].reverse();
    const segMap = new Map<string, { subjects: string[]; count: number }>();
    reversed.forEach(d => segMap.set(d.range_label, d));

    const segments = PIE_SEGMENTS.map(seg => {
      const found = segMap.get(seg.label);
      return { ...seg, count: found?.count ?? 0, subjects: found?.subjects ?? [] };
    }).filter(s => s.count > 0);

    const totalCount = segments.reduce((s, seg) => s + seg.count, 0);
    if (totalCount === 0) return;

    // Calculate dynamic height: pie + list
    const totalSubjectLines = segments.reduce((s, seg) => s + seg.subjects.length, 0);
    const listLineH = 13;
    const listBlockH = segments.length * 16 + totalSubjectLines * listLineH + 16;

    const ctx = Taro.createCanvasContext('compPie');
    const W = 340;
    const pieR = 65, pieInnerR = 36;
    const pieCy = pieR + 12;
    const pieCx = W / 2;
    const listStartY = pieCy + pieR + 20;
    const H = listStartY + listBlockH + 10;

    ctx.setFillStyle('#fff');
    ctx.fillRect(0, 0, W, H);

    // Draw ring (centered, larger)
    let startAngle = -Math.PI / 2;
    segments.forEach(seg => {
      const sliceAngle = (seg.count / totalCount) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;
      ctx.beginPath();
      ctx.arc(pieCx, pieCy, pieR, startAngle, endAngle);
      ctx.arc(pieCx, pieCy, pieInnerR, endAngle, startAngle, true);
      ctx.closePath();
      ctx.setFillStyle(seg.color);
      ctx.fill();
      startAngle = endAngle;
    });

    // Center text
    ctx.setTextAlign('center');
    ctx.setFillStyle('#333');
    ctx.setFontSize(20);
    ctx.fillText(String(totalCount), pieCx, pieCy + 5);
    ctx.setFillStyle('#999');
    ctx.setFontSize(8);
    ctx.fillText('科目数', pieCx, pieCy + 17);

    // Below pie: subject list, two columns
    let curY = listStartY;

    segments.forEach(seg => {
      // Category header
      ctx.setFillStyle(seg.color);
      ctx.beginPath();
      ctx.arc(18, curY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.setFillStyle('#333');
      ctx.setFontSize(10);
      ctx.setTextAlign('left');
      ctx.fillText(`${seg.key} (${seg.count}科)`, 26, curY + 4);
      curY += 16;

      // Subjects in two columns
      for (let i = 0; i < seg.subjects.length; i += 2) {
        const s1 = seg.subjects[i];
        ctx.setFillStyle(seg.color);
        ctx.setFontSize(9);
        ctx.fillText(s1, 26, curY + 3);

        if (i + 1 < seg.subjects.length) {
          const s2 = seg.subjects[i + 1];
          ctx.fillText(s2, 180, curY + 3);
        }
        curY += listLineH;
      }
      curY += 4;
    });

    ctx.draw();
  }, [distribution]);

  // ---------- Grouped ranking ----------
  const grouped: Record<string, SubjectRate[]> = {};
  sorted.forEach(s => {
    const cat = getCategory(s.rate);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  });
  const categoryOrder = ['优秀', '良好', '中等', '及格', '不及格'];

  return (
    <View className='container'>
      <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24rpx' }}>
        <Text className='title' style={{ marginBottom: 0 }}>对比分布</Text>
        {exams.length > 0 && (
          <Picker
            mode='selector'
            range={exams.map((e: any) => e.exam_name)}
            value={examIdx}
            onChange={e => setExamIdx(Number(e.detail.value))}
          >
            <View className='btn-outline' style={{ padding: '8rpx 20rpx', fontSize: '24rpx' }}>
              {exams[examIdx]?.exam_name || '选择考试'} ▼
            </View>
          </Picker>
        )}
      </View>

      {subjects.length >= 3 ? (
        <>
          {/* Radar Chart */}
          <View className='card' style={{ padding: '20rpx', display: 'flex', justifyContent: 'center' }}>
            <Canvas canvasId='compRadar' style={{ width: '680rpx', height: '440rpx' }} />
          </View>

          {/* Stats Row */}
          <View className='stat-row'>
            <View className='stat-card'>
              <Text className='stat-value'>{avgRate.toFixed(1)}%</Text>
              <Text className='stat-label'>平均得分率</Text>
            </View>
            <View className='stat-card'>
              <Text className='stat-value' style={{ color: '#52c41a' }}>{best?.name}</Text>
              <Text className='stat-label'>最强科 {best?.rate.toFixed(1)}%</Text>
            </View>
            <View className='stat-card'>
              <Text className='stat-value' style={{ color: '#ff4d4f' }}>{worst?.name}</Text>
              <Text className='stat-label'>最弱科 {worst?.rate.toFixed(1)}%</Text>
            </View>
          </View>

          {/* Distribution Pie */}
          <View className='card' style={{ padding: '20rpx' }}>
            <Text className='subtitle'>成绩分布</Text>
            <Canvas canvasId='compPie' style={{ width: '680rpx', height: '640rpx' }} />
          </View>

          {/* Score Rate Ranking */}
          <View style={{ marginTop: '20rpx' }}>
            <Text className='subtitle'>得分率排名</Text>
            {categoryOrder.map(cat => {
              const items = grouped[cat];
              if (!items || items.length === 0) return null;
              const { color, tag } = CATEGORY_COLORS[cat];
              return (
                <View className='card' key={cat} style={{ marginBottom: '16rpx', padding: '20rpx' }}>
                  <View style={{ display: 'flex', alignItems: 'center', marginBottom: '16rpx' }}>
                    <View style={{ width: '12rpx', height: '12rpx', borderRadius: '50%', background: color, marginRight: '10rpx' }} />
                    <Text className={`tag ${tag}`}>{cat}</Text>
                  </View>
                  {items.map(s => (
                    <View key={s.name} style={{ marginBottom: '16rpx' }}>
                      <View style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6rpx' }}>
                        <Text style={{ fontSize: '26rpx', fontWeight: 'bold' }}>{s.name}</Text>
                        <Text className='text-secondary' style={{ fontSize: '24rpx' }}>
                          {s.score}/{s.total_score}　{s.rate.toFixed(1)}%
                        </Text>
                      </View>
                      <View style={{ height: '12rpx', borderRadius: '6rpx', background: '#f0f0f0', overflow: 'hidden' }}>
                        <View style={{ width: `${Math.min(s.rate, 100)}%`, height: '100%', borderRadius: '6rpx', background: color }} />
                      </View>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        </>
      ) : (
        <Text className='empty-text'>
          {subjects.length > 0 ? '至少需要3个科目才能显示图表' : '暂无成绩数据'}
        </Text>
      )}
    </View>
  );
}
