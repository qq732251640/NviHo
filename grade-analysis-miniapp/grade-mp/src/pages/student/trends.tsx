import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Canvas, ScrollView } from '@tarojs/components';
import { gradeApi, analysisApi, schoolApi } from '../../api';

interface GradeItem {
  id: number;
  subject_name: string;
  score: number;
  total_score: number;
  exam_name: string;
  exam_date: string;
}

interface TrendItem {
  exam_name: string;
  exam_date: string;
  score: number;
  subject_name: string;
}

interface PredictionItem {
  subject_name: string;
  historical_scores: number[];
  predicted_score: number;
  exam_dates: string[];
}

interface SubjectItem {
  id: number;
  name: string;
  grade_level: string;
  default_total_score: number;
}

export default function StudentTrends() {
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [predictions, setPredictions] = useState<PredictionItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [selected, setSelected] = useState('total');

  useEffect(() => {
    Promise.all([
      gradeApi.getMyGrades(),
      analysisApi.getTrends({}),
      analysisApi.getPrediction(),
      schoolApi.getMySubjects(),
    ]).then(([g, t, p, s]: any[]) => {
      setGrades(Array.isArray(g) ? g : []);
      setTrends(Array.isArray(t) ? t : []);
      setPredictions(Array.isArray(p) ? p : []);
      setSubjects(Array.isArray(s) ? s : []);
    }).catch(() => {});
  }, []);

  const isTotal = selected === 'total';

  const examDateMap = new Map<string, string>();
  grades.forEach(g => {
    if (!examDateMap.has(g.exam_name)) examDateMap.set(g.exam_name, g.exam_date);
  });
  trends.forEach(t => {
    if (!examDateMap.has(t.exam_name)) examDateMap.set(t.exam_name, t.exam_date);
  });
  const sortedExams = [...examDateMap.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([name]) => name);

  let chartPoints: { examName: string; score: number }[] = [];
  if (isTotal) {
    const totals = new Map<string, number>();
    grades.forEach(g => totals.set(g.exam_name, (totals.get(g.exam_name) || 0) + g.score));
    chartPoints = sortedExams
      .filter(e => totals.has(e))
      .map(e => ({ examName: e, score: totals.get(e)! }));
  } else {
    const items = trends.filter(t => t.subject_name === selected);
    const scoreMap = new Map(items.map(t => [t.exam_name, t.score]));
    chartPoints = sortedExams
      .filter(e => scoreMap.has(e))
      .map(e => ({ examName: e, score: scoreMap.get(e)! }));
  }

  let predictedScore: number | null = null;
  if (predictions.length > 0) {
    if (isTotal) {
      predictedScore = predictions.reduce((sum, p) => sum + p.predicted_score, 0);
    } else {
      const pred = predictions.find(p => p.subject_name === selected);
      if (pred) predictedScore = pred.predicted_score;
    }
  }

  const scores = chartPoints.map(p => p.score);
  const maxScore = scores.length ? Math.max(...scores) : 0;
  const minScore = scores.length ? Math.min(...scores) : 0;
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const stdDev = scores.length > 1
    ? Math.sqrt(scores.reduce((sum, s) => sum + (s - avgScore) ** 2, 0) / scores.length)
    : 0;
  const stability = scores.length > 1 && avgScore > 0
    ? Math.min(100, Math.max(0, 100 - (stdDev / avgScore * 100)))
    : 100;

  // Canvas drawing
  useEffect(() => {
    if (!chartPoints.length) return;

    const ctx = Taro.createCanvasContext('trendCanvas');
    const W = 340, H = 220;
    const ML = 42, MR = 20, MT = 28, MB = 40;
    const plotW = W - ML - MR;
    const plotH = H - MT - MB;

    const allVals = scores.slice();
    if (predictedScore !== null) allVals.push(predictedScore);

    const rawMax = Math.max(...allVals);
    const rawMin = Math.min(...allVals);
    const range = rawMax - rawMin || 10;
    const pad = range * 0.2;
    const yMin = Math.max(0, Math.floor(rawMin - pad));
    const yMax = Math.ceil(rawMax + pad);

    const nPoints = chartPoints.length + (predictedScore !== null ? 1 : 0);
    const toX = (i: number) => ML + (nPoints > 1 ? (i / (nPoints - 1)) * plotW : plotW / 2);
    const toY = (v: number) => MT + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

    ctx.setFillStyle('#fff');
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i <= 4; i++) {
      const y = MT + (plotH / 4) * i;
      ctx.setStrokeStyle('#f0f0f0');
      ctx.setLineWidth(0.5);
      ctx.beginPath(); ctx.moveTo(ML, y); ctx.lineTo(W - MR, y); ctx.stroke();
      const val = yMax - ((yMax - yMin) / 4) * i;
      ctx.setFillStyle('#999'); ctx.setFontSize(8); ctx.setTextAlign('right');
      ctx.fillText(val.toFixed(0), ML - 4, y + 3);
    }

    ctx.setStrokeStyle('#ddd'); ctx.setLineWidth(1);
    ctx.beginPath();
    ctx.moveTo(ML, MT); ctx.lineTo(ML, H - MB); ctx.lineTo(W - MR, H - MB);
    ctx.stroke();

    ctx.setFontSize(7); ctx.setTextAlign('center');
    chartPoints.forEach((p, i) => {
      ctx.setFillStyle('#666');
      const label = p.examName.length > 5 ? p.examName.slice(0, 5) + '..' : p.examName;
      ctx.fillText(label, toX(i), H - MB + 12);
    });
    if (predictedScore !== null) {
      ctx.setFillStyle('#faad14');
      ctx.fillText('预测', toX(chartPoints.length), H - MB + 12);
    }

    const mainColor = '#5b21b6';
    ctx.setStrokeStyle(mainColor); ctx.setLineWidth(2.5);
    ctx.beginPath();
    chartPoints.forEach((p, i) => {
      const x = toX(i), y = toY(p.score);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    chartPoints.forEach((p, i) => {
      const x = toX(i), y = toY(p.score);

      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.setFillStyle('#fff'); ctx.fill();
      ctx.setStrokeStyle(mainColor); ctx.setLineWidth(2);
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.stroke();

      ctx.setFillStyle(mainColor); ctx.setFontSize(9); ctx.setTextAlign('center');
      ctx.fillText(String(p.score), x, y - 10);

      if (i > 0) {
        const diff = p.score - chartPoints[i - 1].score;
        if (diff !== 0) {
          ctx.setFillStyle(diff > 0 ? '#52c41a' : '#ff4d4f');
          ctx.setFontSize(7);
          ctx.fillText(diff > 0 ? `+${diff}` : `${diff}`, x, diff > 0 ? y - 18 : y + 16);
        }
      }
    });

    if (predictedScore !== null && chartPoints.length > 0) {
      const li = chartPoints.length - 1;
      const lx = toX(li), ly = toY(chartPoints[li].score);
      const px = toX(chartPoints.length), py = toY(predictedScore);

      ctx.setStrokeStyle('#faad14'); ctx.setLineWidth(2);
      for (let seg = 0; seg < 20; seg++) {
        const t1 = seg / 20, t2 = (seg + 0.6) / 20;
        ctx.beginPath();
        ctx.moveTo(lx + (px - lx) * t1, ly + (py - ly) * t1);
        ctx.lineTo(lx + (px - lx) * t2, ly + (py - ly) * t2);
        ctx.stroke();
      }

      ctx.setFillStyle('#faad14');
      ctx.setFontSize(14); ctx.setTextAlign('center');
      ctx.fillText('☆', px, py + 5);
      ctx.setFontSize(9);
      ctx.fillText(`预测: ${Math.round(predictedScore)}`, px, py - 10);
    }

    ctx.draw();
  }, [grades, trends, predictions, selected]);

  return (
    <View className='container'>
      <Text className='title'>趋势预测</Text>

      <ScrollView scrollX style={{ whiteSpace: 'nowrap', marginBottom: '20px' }}>
        <View
          onClick={() => setSelected('total')}
          style={{
            display: 'inline-block',
            padding: '8px 20px',
            borderRadius: '20px',
            fontSize: '24px',
            fontWeight: 'bold',
            marginRight: '12px',
            background: isTotal ? '#5b21b6' : '#fff',
            color: isTotal ? '#fff' : '#5b21b6',
            border: '2px solid #5b21b6',
          }}
        >
          <Text>总分</Text>
        </View>
        {subjects.map(s => {
          const active = selected === s.name;
          return (
            <View
              key={s.id}
              onClick={() => setSelected(s.name)}
              style={{
                display: 'inline-block',
                padding: '8px 20px',
                borderRadius: '20px',
                fontSize: '24px',
                fontWeight: active ? 'bold' : 'normal',
                marginRight: '12px',
                background: active ? '#5b21b6' : '#fff',
                color: active ? '#fff' : '#5b21b6',
                border: '2px solid #5b21b6',
              }}
            >
              <Text>{s.name}</Text>
            </View>
          );
        })}
      </ScrollView>

      {scores.length > 0 && (
        <View className='stat-row' style={{ marginBottom: '20px' }}>
          <View className='stat-card'>
            <Text className='stat-value'>{maxScore}</Text>
            <Text className='stat-label'>{isTotal ? '最高总分' : '最高分'}</Text>
          </View>
          <View className='stat-card'>
            <Text className='stat-value'>{minScore}</Text>
            <Text className='stat-label'>{isTotal ? '最低总分' : '最低分'}</Text>
          </View>
          <View className='stat-card'>
            <Text className='stat-value'>{avgScore.toFixed(1)}</Text>
            <Text className='stat-label'>{isTotal ? '平均总分' : '平均分'}</Text>
          </View>
          <View className='stat-card'>
            <Text className='stat-value'>{stability.toFixed(1)}%</Text>
            <Text className='stat-label'>稳定率</Text>
          </View>
        </View>
      )}

      {chartPoints.length > 0 ? (
        <>
          <View className='card' style={{ padding: '16px' }}>
            <Canvas canvasId='trendCanvas' style={{ width: '680rpx', height: '440rpx' }} />
          </View>

          {sortedExams.map(examName => {
            const examGrades = grades.filter(g => g.exam_name === examName);
            if (!examGrades.length) return null;

            if (isTotal) {
              const total = examGrades.reduce((s, g) => s + g.score, 0);
              return (
                <View key={examName} className='card'>
                  <Text className='subtitle'>{examName}</Text>
                  {examGrades.map((g, i) => (
                    <View key={i} className='list-item'>
                      <Text className='text-secondary'>{g.subject_name}</Text>
                      <Text style={{ fontWeight: 'bold', color: '#5b21b6' }}>{g.score}</Text>
                    </View>
                  ))}
                  <View style={{
                    display: 'flex', justifyContent: 'space-between',
                    paddingTop: '12px', marginTop: '4px', borderTop: '2px solid #5b21b6',
                  }}>
                    <Text style={{ fontWeight: 'bold' }}>总分</Text>
                    <Text style={{ fontWeight: 'bold', color: '#5b21b6', fontSize: '32px' }}>{total}</Text>
                  </View>
                </View>
              );
            }

            const item = examGrades.find(g => g.subject_name === selected);
            if (!item) return null;
            return (
              <View key={examName} className='card'>
                <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{examName}</Text>
                    <Text className='text-secondary'>{item.exam_date}</Text>
                  </View>
                  <Text style={{ fontWeight: 'bold', color: '#5b21b6', fontSize: '40px' }}>{item.score}</Text>
                </View>
              </View>
            );
          })}
        </>
      ) : (
        <Text className='empty-text'>暂无趋势数据</Text>
      )}
    </View>
  );
}
