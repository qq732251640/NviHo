import { useEffect, useState, useRef } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Canvas, Picker } from '@tarojs/components';
import { analysisApi, gradeApi } from '../../api';

const RANGE_CONFIG: Record<string, { color: string; tagClass: string; midpoint: number }> = {
  '90-100 优秀': { color: '#52c41a', tagClass: 'tag-green', midpoint: 95 },
  '80-89 良好': { color: '#1890ff', tagClass: 'tag-blue', midpoint: 84.5 },
  '70-79 中等': { color: '#faad14', tagClass: 'tag-gold', midpoint: 74.5 },
  '60-69 及格': { color: '#722ed1', tagClass: 'tag-purple', midpoint: 64.5 },
  '0-59 不及格': { color: '#ff4d4f', tagClass: 'tag-red', midpoint: 30 },
};

export default function StudentDistribution() {
  const [distribution, setDistribution] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [examIdx, setExamIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analysisApi.listExams().then(setExams);
  }, []);

  useEffect(() => {
    setLoading(true);
    const examName = exams.length > 0 ? exams[examIdx]?.exam_name : undefined;
    analysisApi
      .getMyDistribution(examName)
      .then((res: any) => setDistribution(Array.isArray(res) ? res : []))
      .catch(() => setDistribution([]))
      .finally(() => setLoading(false));
  }, [exams, examIdx]);

  const totalSubjects = distribution.reduce((s: number, d: any) => s + d.count, 0);
  const weightedSum = distribution.reduce((s: number, d: any) => {
    const cfg = RANGE_CONFIG[d.range_label];
    return s + (cfg?.midpoint || 0) * d.count;
  }, 0);
  const avgRate = totalSubjects > 0 ? weightedSum / totalSubjects : 0;

  useEffect(() => {
    if (!distribution.length) return;

    const ctx = Taro.createCanvasContext('ringCanvas');
    const size = 150;
    const cx = size / 2, cy = size / 2;
    const outerR = 60, innerR = 36;

    ctx.setFillStyle('#fff');
    ctx.fillRect(0, 0, size, size);

    if (totalSubjects === 0) {
      ctx.draw();
      return;
    }

    let startAngle = -Math.PI / 2;
    distribution.forEach((item: any) => {
      if (item.count === 0) return;
      const sliceAngle = (item.count / totalSubjects) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;
      const color = RANGE_CONFIG[item.range_label]?.color || '#ccc';

      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, endAngle);
      ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
      ctx.closePath();
      ctx.setFillStyle(color);
      ctx.fill();

      startAngle = endAngle;
    });

    ctx.setFillStyle('#333');
    ctx.setFontSize(16);
    ctx.setTextAlign('center');
    ctx.setTextBaseline('bottom');
    ctx.fillText(`${avgRate.toFixed(0)}%`, cx, cy + 2);

    ctx.setFillStyle('#999');
    ctx.setFontSize(9);
    ctx.setTextBaseline('top');
    ctx.fillText('平均得分率', cx, cy + 4);

    ctx.draw();
  }, [distribution]);

  if (loading) {
    return (
      <View className='container'>
        <Text className='empty-text'>加载中...</Text>
      </View>
    );
  }

  return (
    <View className='container'>
      <Text className='title'>我的成绩分布</Text>

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

      {distribution.length > 0 ? (
        <>
          <View className='card' style={{ padding: '24px', display: 'flex', justifyContent: 'center' }}>
            <Canvas canvasId='ringCanvas' style={{ width: '300rpx', height: '300rpx' }} />
          </View>

          <View className='card' style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
            {distribution.filter((d: any) => d.count > 0).map((item: any) => {
              const cfg = RANGE_CONFIG[item.range_label];
              return (
                <View key={item.range_label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <View style={{ width: '16px', height: '16px', borderRadius: '4px', background: cfg?.color || '#ccc' }} />
                  <Text style={{ fontSize: '22px', color: '#666' }}>{item.range_label} ({item.count}科)</Text>
                </View>
              );
            })}
          </View>

          {distribution.map((item: any) => {
            const cfg = RANGE_CONFIG[item.range_label];
            if (!cfg) return null;
            return (
              <View
                key={item.range_label}
                className='card'
                style={{
                  padding: '20px',
                  borderLeft: `6px solid ${cfg.color}`,
                }}
              >
                <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <Text style={{ color: cfg.color, fontWeight: 'bold', fontSize: '28px' }}>{item.range_label}</Text>
                  <Text className={`tag ${cfg.tagClass}`}>{item.count} 科</Text>
                </View>
                {item.subjects && item.subjects.length > 0 ? (
                  <View style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {item.subjects.map((s: string, i: number) => (
                      <Text
                        key={i}
                        style={{
                          fontSize: '24px',
                          color: cfg.color,
                          background: `${cfg.color}15`,
                          padding: '6px 16px',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                        }}
                      >
                        {s}
                      </Text>
                    ))}
                  </View>
                ) : (
                  <Text className='text-secondary'>暂无科目</Text>
                )}
              </View>
            );
          })}
        </>
      ) : (
        <Text className='empty-text'>暂无成绩数据</Text>
      )}
    </View>
  );
}
