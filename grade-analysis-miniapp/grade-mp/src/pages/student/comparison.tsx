import { useEffect, useState, useRef } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Canvas, Picker } from '@tarojs/components';
import { analysisApi, gradeApi } from '../../api';

interface SubjectRate {
  name: string;
  score: number;
  total_score: number;
  rate: number;
}

export default function StudentComparison() {
  const [grades, setGrades] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [examIdx, setExamIdx] = useState(0);

  useEffect(() => {
    gradeApi.getMyGrades().then((res: any) => setGrades(Array.isArray(res) ? res : []));
    analysisApi.listExams().then(setExams);
  }, []);

  const examName = exams[examIdx]?.exam_name;
  const examGrades = examName ? grades.filter((g: any) => g.exam_name === examName) : [];
  const subjects: SubjectRate[] = examGrades.map((g: any) => ({
    name: g.subject_name,
    score: g.score,
    total_score: g.total_score,
    rate: g.total_score > 0 ? (g.score / g.total_score) * 100 : 0,
  }));

  useEffect(() => {
    if (subjects.length < 3) return;

    const ctx = Taro.createCanvasContext('radarCanvas');
    const W = 300, H = 300;
    const cx = W / 2, cy = H / 2;
    const maxR = 100;

    ctx.setFillStyle('#fff');
    ctx.fillRect(0, 0, W, H);

    const n = subjects.length;
    const step = (Math.PI * 2) / n;

    const levels = [20, 40, 60, 80, 100];
    levels.forEach(level => {
      const r = (level / 100) * maxR;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const angle = -Math.PI / 2 + step * (i % n);
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.setStrokeStyle(level === 100 ? '#ddd' : '#f0f0f0');
      ctx.setLineWidth(0.5);
      ctx.stroke();

      if (level % 40 === 0 || level === 100) {
        ctx.setFillStyle('#ccc');
        ctx.setFontSize(7);
        ctx.setTextAlign('center');
        ctx.fillText(`${level}%`, cx, cy - r - 2);
      }
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
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.setGlobalAlpha(0.25);
    ctx.setFillStyle('#5b21b6');
    ctx.fill();
    ctx.setGlobalAlpha(1);
    ctx.setStrokeStyle('#5b21b6');
    ctx.setLineWidth(2);
    ctx.stroke();

    subjects.forEach((s, i) => {
      const angle = -Math.PI / 2 + step * i;
      const r = (Math.min(s.rate, 100) / 100) * maxR;
      const dx = cx + r * Math.cos(angle);
      const dy = cy + r * Math.sin(angle);

      ctx.beginPath();
      ctx.arc(dx, dy, 3, 0, Math.PI * 2);
      ctx.setFillStyle('#5b21b6');
      ctx.fill();

      const lx = cx + (maxR + 18) * Math.cos(angle);
      const ly = cy + (maxR + 18) * Math.sin(angle);
      ctx.setTextAlign('center');
      ctx.setFillStyle('#333');
      ctx.setFontSize(9);
      ctx.fillText(s.name, lx, ly - 4);
      ctx.setFillStyle('#5b21b6');
      ctx.setFontSize(8);
      ctx.fillText(`${s.rate.toFixed(0)}%`, lx, ly + 8);
    });

    ctx.draw();
  }, [grades, exams, examIdx]);

  const avgRate = subjects.length > 0
    ? subjects.reduce((s, i) => s + i.rate, 0) / subjects.length
    : 0;
  const best = subjects.length > 0 ? subjects.reduce((a, b) => (a.rate > b.rate ? a : b)) : null;
  const worst = subjects.length > 0 ? subjects.reduce((a, b) => (a.rate < b.rate ? a : b)) : null;

  return (
    <View className='container'>
      <Text className='title'>科目雷达图</Text>

      {exams.length > 0 && (
        <View style={{ marginBottom: '24px' }}>
          <Picker
            mode='selector'
            range={exams.map((e: any) => e.exam_name)}
            value={examIdx}
            onChange={e => setExamIdx(Number(e.detail.value))}
          >
            <View className='btn-outline' style={{ padding: '12px 20px', fontSize: '24px', display: 'inline-block' }}>
              {exams[examIdx]?.exam_name || '选择考试'}
            </View>
          </Picker>
        </View>
      )}

      {subjects.length >= 3 ? (
        <>
          <View className='card' style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
            <Canvas canvasId='radarCanvas' style={{ width: '600rpx', height: '600rpx' }} />
          </View>

          <View className='stat-row' style={{ marginBottom: '24px' }}>
            <View className='stat-card'>
              <Text className='stat-value' style={{ fontSize: '32px' }}>{avgRate.toFixed(1)}%</Text>
              <Text className='stat-label'>平均得分率</Text>
            </View>
            <View className='stat-card'>
              <Text className='stat-value' style={{ color: '#52c41a', fontSize: '32px' }}>{best?.name}</Text>
              <Text className='stat-label'>最强 {best?.rate.toFixed(1)}%</Text>
            </View>
            <View className='stat-card'>
              <Text className='stat-value' style={{ color: '#ff4d4f', fontSize: '32px' }}>{worst?.name}</Text>
              <Text className='stat-label'>最弱 {worst?.rate.toFixed(1)}%</Text>
            </View>
          </View>

          <View className='card' style={{ padding: '20px' }}>
            <Text className='subtitle'>满分差距</Text>
            {subjects.map(s => (
              <View key={s.name} className='list-item'>
                <View>
                  <Text style={{ fontWeight: 'bold' }}>{s.name}</Text>
                  <Text className='text-secondary' style={{ marginLeft: '12px' }}>
                    {s.score}/{s.total_score}
                  </Text>
                </View>
                <Text style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                  差 {(s.total_score - s.score).toFixed(0)} 分
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <Text className='empty-text'>
          {subjects.length > 0 ? '至少需要3个科目才能显示雷达图' : '暂无成绩数据'}
        </Text>
      )}
    </View>
  );
}
