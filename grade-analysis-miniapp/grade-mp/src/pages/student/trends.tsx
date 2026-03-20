import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Canvas, Picker } from '@tarojs/components';
import { analysisApi } from '../../api';

const LINE_COLORS = ['#5b21b6', '#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2', '#eb2f96', '#f5222d', '#2f54eb'];

interface TrendItem { exam_name: string; exam_date: string; score: number; subject_name: string; }

export default function StudentTrends() {
  const [data, setData] = useState<TrendItem[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectIdx, setSubjectIdx] = useState(1);

  useEffect(() => {
    analysisApi.getTrends({}).then((res: any) => {
      const arr: TrendItem[] = Array.isArray(res) ? res : [];
      setData(arr);
      const names = [...new Set(arr.map(t => t.subject_name))];
      setSubjects(names);
      setSubjectIdx(0);
    }).catch(() => setData([]));
  }, []);

  const isSingle = subjectIdx > 0;
  const selectedSubject = isSingle ? subjects[subjectIdx - 1] : '';
  const filtered = selectedSubject ? data.filter(d => d.subject_name === selectedSubject) : data;

  const subjectMap = new Map<string, TrendItem[]>();
  filtered.forEach(item => {
    const list = subjectMap.get(item.subject_name) || [];
    list.push(item);
    subjectMap.set(item.subject_name, list);
  });
  const examNames = [...new Set(data.map(d => d.exam_name))];

  useEffect(() => {
    if (!filtered.length || !examNames.length) return;
    const ctx = Taro.createCanvasContext('trendCanvas');
    const W = 340, H = 220;
    const ML = 38, MR = isSingle ? 20 : 55, MT = 20, MB = 40;
    const plotW = W - ML - MR;
    const plotH = H - MT - MB;

    ctx.setFillStyle('#fff');
    ctx.fillRect(0, 0, W, H);

    const allScores = filtered.map(d => d.score);
    const rawMax = Math.max(...allScores);
    const rawMin = Math.min(...allScores);
    const range = rawMax - rawMin || 10;
    const padding = isSingle ? range * 0.3 : range * 0.15;
    const yMin = Math.max(0, Math.floor(rawMin - padding));
    const yMax = Math.ceil(rawMax + padding);

    const toX = (i: number) => ML + (examNames.length > 1 ? (i / (examNames.length - 1)) * plotW : plotW / 2);
    const toY = (score: number) => MT + plotH - ((score - yMin) / (yMax - yMin)) * plotH;

    // Grid
    for (let i = 0; i <= 4; i++) {
      const y = MT + (plotH / 4) * i;
      ctx.setStrokeStyle('#f0f0f0');
      ctx.setLineWidth(0.5);
      ctx.beginPath(); ctx.moveTo(ML, y); ctx.lineTo(W - MR, y); ctx.stroke();
      const val = yMax - ((yMax - yMin) / 4) * i;
      ctx.setFillStyle('#999'); ctx.setFontSize(8); ctx.setTextAlign('right');
      ctx.fillText(val.toFixed(0), ML - 4, y + 3);
    }

    // Axes
    ctx.setStrokeStyle('#ddd'); ctx.setLineWidth(1);
    ctx.beginPath(); ctx.moveTo(ML, MT); ctx.lineTo(ML, H - MB); ctx.lineTo(W - MR, H - MB); ctx.stroke();

    // X labels
    ctx.setFillStyle('#666'); ctx.setFontSize(8); ctx.setTextAlign('center');
    examNames.forEach((name, i) => {
      const x = toX(i);
      const label = name.length > 6 ? name.slice(0, 6) + '..' : name;
      ctx.fillText(label, x, H - MB + 14);
    });

    // Lines
    const subjectNames = [...subjectMap.keys()];
    subjectNames.forEach((subName, si) => {
      const color = LINE_COLORS[si % LINE_COLORS.length];
      const items = subjectMap.get(subName) || [];
      const points: { x: number; y: number; score: number }[] = [];
      items.forEach(item => {
        const idx = examNames.indexOf(item.exam_name);
        if (idx >= 0) points.push({ x: toX(idx), y: toY(item.score), score: item.score });
      });
      points.sort((a, b) => a.x - b.x);
      if (!points.length) return;

      ctx.setStrokeStyle(color); ctx.setLineWidth(isSingle ? 3 : 2);
      ctx.beginPath();
      points.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.stroke();

      // Data points
      points.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, isSingle ? 4 : 3, 0, Math.PI * 2);
        ctx.setFillStyle('#fff'); ctx.fill();
        ctx.setStrokeStyle(color); ctx.setLineWidth(2);
        ctx.beginPath(); ctx.arc(p.x, p.y, isSingle ? 4 : 3, 0, Math.PI * 2); ctx.stroke();
      });

      // Labels on points (single mode) or end label (multi mode)
      if (isSingle) {
        ctx.setFillStyle(color); ctx.setFontSize(9); ctx.setTextAlign('center');
        points.forEach(p => { ctx.fillText(String(p.score), p.x, p.y - 8); });
      } else {
        const last = points[points.length - 1];
        ctx.setFillStyle(color); ctx.setFontSize(8); ctx.setTextAlign('left');
        ctx.fillText(subName, last.x + 5, last.y + 3);
      }
    });

    ctx.draw();
  }, [data, subjectIdx]);

  // Trend calculation for single subject
  const trendInfo = () => {
    if (!isSingle || !selectedSubject) return null;
    const items = data.filter(d => d.subject_name === selectedSubject).sort((a, b) => a.exam_date.localeCompare(b.exam_date));
    if (items.length < 2) return null;
    const first = items[0].score, last = items[items.length - 1].score;
    const diff = last - first;
    return { diff, direction: diff > 0 ? '上升' : diff < 0 ? '下降' : '持平', color: diff > 0 ? '#52c41a' : diff < 0 ? '#ff4d4f' : '#999' };
  };
  const trend = trendInfo();

  return (
    <View className='container'>
      <Text className='title'>成绩趋势</Text>

      <Picker mode='selector' range={['全部科目（叠加）', ...subjects]} value={subjectIdx}
        onChange={e => setSubjectIdx(Number(e.detail.value))}>
        <View className='btn-outline' style={{ padding: '12px 20px', fontSize: '24px', display: 'inline-block', marginBottom: '16px' }}>
          {selectedSubject || '全部科目（叠加）'}
        </View>
      </Picker>

      {trend && (
        <View style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <View className='stat-card' style={{ flex: 1 }}>
            <Text className='stat-value' style={{ color: trend.color, fontSize: '36px' }}>
              {trend.diff > 0 ? '+' : ''}{trend.diff}
            </Text>
            <Text className='stat-label'>{trend.direction}趋势</Text>
          </View>
          <View className='stat-card' style={{ flex: 1 }}>
            <Text className='stat-value' style={{ fontSize: '36px' }}>
              {data.filter(d => d.subject_name === selectedSubject).slice(-1)[0]?.score}
            </Text>
            <Text className='stat-label'>最近成绩</Text>
          </View>
        </View>
      )}

      {filtered.length > 0 ? (
        <>
          <View className='card' style={{ padding: '16px' }}>
            <Canvas canvasId='trendCanvas' style={{ width: '680rpx', height: '440rpx' }} />
          </View>

          {!isSingle && subjects.length > 1 && (
            <View className='card' style={{ padding: '16px' }}>
              <Text className='text-secondary' style={{ display: 'block', marginBottom: '8px' }}>点击科目查看单科趋势</Text>
              <View style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {subjects.map((name, i) => (
                  <View key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: '#f5f5f5' }}
                    onClick={() => setSubjectIdx(i + 1)}>
                    <View style={{ width: '14px', height: '14px', borderRadius: '3px', background: LINE_COLORS[i % LINE_COLORS.length] }} />
                    <Text style={{ fontSize: '24px' }}>{name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {examNames.map(examName => {
            const items = filtered.filter(d => d.exam_name === examName);
            if (!items.length) return null;
            return (
              <View key={examName} className='card' style={{ padding: '16px' }}>
                <Text style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>{examName}</Text>
                {items.map((item, i) => (
                  <View key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                    <Text style={{ color: '#666', fontSize: '24px' }}>{item.subject_name}</Text>
                    <Text style={{ fontWeight: 'bold', color: '#5b21b6' }}>{item.score}</Text>
                  </View>
                ))}
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
