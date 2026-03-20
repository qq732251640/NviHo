import { useEffect, useState, useRef } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Canvas, Picker } from '@tarojs/components';
import { analysisApi, gradeApi } from '../../api';

const LINE_COLORS = ['#5b21b6', '#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2', '#eb2f96'];

interface TrendItem {
  exam_name: string;
  exam_date: string;
  score: number;
  subject_name: string;
}

export default function StudentTrends() {
  const [data, setData] = useState<TrendItem[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectIdx, setSubjectIdx] = useState(0);

  useEffect(() => {
    analysisApi.getTrends({}).then((res: any) => {
      const arr: TrendItem[] = Array.isArray(res) ? res : [];
      setData(arr);
      setSubjects([...new Set(arr.map(t => t.subject_name))]);
    }).catch(() => setData([]));
  }, []);

  const selectedSubject = subjectIdx === 0 ? '' : subjects[subjectIdx - 1];
  const filtered = selectedSubject ? data.filter(d => d.subject_name === selectedSubject) : data;

  const subjectMap = new Map<string, TrendItem[]>();
  filtered.forEach(item => {
    const list = subjectMap.get(item.subject_name) || [];
    list.push(item);
    subjectMap.set(item.subject_name, list);
  });
  const examNames = [...new Set(filtered.map(d => d.exam_name))];

  useEffect(() => {
    if (!filtered.length || !examNames.length) return;

    const ctx = Taro.createCanvasContext('trendCanvas');
    const W = 340, H = 200;
    const ML = 36, MR = 50, MT = 16, MB = 36;
    const plotW = W - ML - MR;
    const plotH = H - MT - MB;

    ctx.setFillStyle('#fff');
    ctx.fillRect(0, 0, W, H);

    const allScores = filtered.map(d => d.score);
    const rawMax = Math.max(...allScores, 100);
    const rawMin = Math.min(...allScores, 0);
    const padding = (rawMax - rawMin) * 0.15 || 10;
    const yMin = Math.max(0, Math.floor(rawMin - padding));
    const yMax = Math.ceil(rawMax + padding);

    const toX = (i: number) => ML + (examNames.length > 1 ? (i / (examNames.length - 1)) * plotW : plotW / 2);
    const toY = (score: number) => MT + plotH - ((score - yMin) / (yMax - yMin)) * plotH;

    for (let i = 0; i <= 4; i++) {
      const y = MT + (plotH / 4) * i;
      ctx.setStrokeStyle('#f0f0f0');
      ctx.setLineWidth(0.5);
      ctx.beginPath();
      ctx.moveTo(ML, y);
      ctx.lineTo(W - MR, y);
      ctx.stroke();

      const val = yMax - ((yMax - yMin) / 4) * i;
      ctx.setFillStyle('#999');
      ctx.setFontSize(8);
      ctx.setTextAlign('right');
      ctx.fillText(val.toFixed(0), ML - 4, y + 3);
    }

    ctx.setStrokeStyle('#ddd');
    ctx.setLineWidth(1);
    ctx.beginPath();
    ctx.moveTo(ML, MT);
    ctx.lineTo(ML, H - MB);
    ctx.lineTo(W - MR, H - MB);
    ctx.stroke();

    ctx.setFillStyle('#999');
    ctx.setFontSize(7);
    ctx.setTextAlign('center');
    examNames.forEach((name, i) => {
      const x = toX(i);
      const label = name.length > 5 ? name.slice(0, 5) + '..' : name;
      ctx.fillText(label, x, H - MB + 14);
    });

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

      ctx.setStrokeStyle(color);
      ctx.setLineWidth(2);
      ctx.beginPath();
      points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.setFillStyle(color);
        ctx.fill();
      });

      const last = points[points.length - 1];
      ctx.setFillStyle(color);
      ctx.setFontSize(8);
      ctx.setTextAlign('left');
      ctx.fillText(subName, last.x + 5, last.y - 2);
    });

    ctx.draw();
  }, [data, subjectIdx]);

  return (
    <View className='container'>
      <Text className='title'>成绩趋势</Text>

      <View style={{ marginBottom: '24px' }}>
        <Picker
          mode='selector'
          range={['全部科目', ...subjects]}
          value={subjectIdx}
          onChange={e => setSubjectIdx(Number(e.detail.value))}
        >
          <View className='btn-outline' style={{ padding: '12px 20px', fontSize: '24px', display: 'inline-block' }}>
            {selectedSubject || '全部科目'}
          </View>
        </Picker>
      </View>

      {filtered.length > 0 ? (
        <>
          <View className='card' style={{ padding: '20px' }}>
            <Canvas canvasId='trendCanvas' style={{ width: '680rpx', height: '400rpx' }} />
          </View>

          {subjects.length > 1 && !selectedSubject && (
            <View className='card' style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {[...subjectMap.keys()].map((name, i) => (
                <View key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <View style={{ width: '16px', height: '16px', borderRadius: '4px', background: LINE_COLORS[i % LINE_COLORS.length] }} />
                  <Text style={{ fontSize: '22px', color: '#666' }}>{name}</Text>
                </View>
              ))}
            </View>
          )}

          {examNames.map(examName => {
            const items = filtered.filter(d => d.exam_name === examName);
            return (
              <View key={examName} className='card' style={{ padding: '20px' }}>
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
