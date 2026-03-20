import { useEffect, useState, useRef } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Canvas, Picker } from '@tarojs/components';
import { analysisApi, gradeApi } from '../../api';

interface Prediction {
  subject_name: string;
  historical_scores: number[];
  predicted_score: number;
  exam_dates: string[];
}

export default function StudentPrediction() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  useEffect(() => {
    analysisApi
      .getPrediction()
      .then((res: any) => setPredictions(Array.isArray(res) ? res : []))
      .catch(() => setPredictions([]));
  }, []);

  useEffect(() => {
    if (!predictions.length) return;

    predictions.forEach((item, idx) => {
      if (item.historical_scores.length < 2) return;

      const canvasId = `spark_${idx}`;
      const ctx = Taro.createCanvasContext(canvasId);
      const W = 300, H = 100;
      const ML = 8, MR = 40, MT = 12, MB = 12;
      const plotW = W - ML - MR;
      const plotH = H - MT - MB;

      const allScores = [...item.historical_scores, item.predicted_score];
      const maxS = Math.max(...allScores);
      const minS = Math.min(...allScores);
      const range = maxS - minS || 1;
      const yPad = range * 0.15;
      const yMin = minS - yPad;
      const yMax = maxS + yPad;

      const n = item.historical_scores.length;
      const totalPts = n + 1;

      const toX = (i: number) => ML + (i / (totalPts - 1)) * plotW;
      const toY = (s: number) => MT + plotH - ((s - yMin) / (yMax - yMin)) * plotH;

      ctx.setFillStyle('#fafafa');
      ctx.fillRect(0, 0, W, H);

      ctx.setStrokeStyle('#f0f0f0');
      ctx.setLineWidth(0.5);
      for (let i = 0; i <= 2; i++) {
        const y = MT + (plotH / 2) * i;
        ctx.beginPath();
        ctx.moveTo(ML, y);
        ctx.lineTo(W - MR, y);
        ctx.stroke();
      }

      ctx.setStrokeStyle('#5b21b6');
      ctx.setLineWidth(2);
      ctx.beginPath();
      item.historical_scores.forEach((s, i) => {
        if (i === 0) ctx.moveTo(toX(i), toY(s));
        else ctx.lineTo(toX(i), toY(s));
      });
      ctx.stroke();

      const lastIdx = n - 1;
      const lastScore = item.historical_scores[lastIdx];
      const isUp = item.predicted_score >= lastScore;
      const predColor = isUp ? '#52c41a' : '#ff4d4f';

      ctx.setStrokeStyle(predColor);
      ctx.setLineWidth(2);
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(toX(lastIdx), toY(lastScore));
      ctx.lineTo(toX(n), toY(item.predicted_score));
      ctx.stroke();
      ctx.setLineDash([]);

      item.historical_scores.forEach((s, i) => {
        ctx.beginPath();
        ctx.arc(toX(i), toY(s), 3, 0, Math.PI * 2);
        ctx.setFillStyle('#5b21b6');
        ctx.fill();
      });

      ctx.beginPath();
      ctx.arc(toX(n), toY(item.predicted_score), 4, 0, Math.PI * 2);
      ctx.setFillStyle(predColor);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(toX(n), toY(item.predicted_score), 2, 0, Math.PI * 2);
      ctx.setFillStyle('#fff');
      ctx.fill();

      ctx.setFillStyle(predColor);
      ctx.setFontSize(10);
      ctx.setTextAlign('left');
      ctx.fillText(`${item.predicted_score.toFixed(0)}`, toX(n) + 6, toY(item.predicted_score) + 4);

      ctx.draw();
    });
  }, [predictions]);

  if (predictions.length === 0) {
    return (
      <View className='container'>
        <Text className='title'>成绩预测</Text>
        <Text className='empty-text'>暂无预测数据（需要至少两次考试成绩）</Text>
      </View>
    );
  }

  return (
    <View className='container'>
      <Text className='title'>成绩预测</Text>
      <Text className='text-secondary' style={{ display: 'block', marginBottom: '24px' }}>
        基于历史成绩趋势的智能预测
      </Text>

      {predictions.map((item, idx) => {
        const n = item.historical_scores.length;
        const lastScore = n > 0 ? item.historical_scores[n - 1] : 0;
        const diff = item.predicted_score - lastScore;
        const isUp = diff >= 0;
        const trendColor = isUp ? '#52c41a' : '#ff4d4f';

        return (
          <View key={idx} className='card' style={{ padding: '24px' }}>
            <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <Text style={{ fontWeight: 'bold', fontSize: '30px' }}>{item.subject_name}</Text>
              <View style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Text style={{ fontSize: '24px', color: trendColor, fontWeight: 'bold' }}>
                  {isUp ? '▲' : '▼'}
                </Text>
                <Text style={{ fontSize: '30px', fontWeight: 'bold', color: trendColor }}>
                  预测 {item.predicted_score.toFixed(0)}分
                </Text>
              </View>
            </View>

            {n >= 2 ? (
              <Canvas canvasId={`spark_${idx}`} style={{ width: '600rpx', height: '200rpx', marginBottom: '12px' }} />
            ) : (
              <Text className='text-secondary' style={{ display: 'block', marginBottom: '12px' }}>
                历史数据不足，无法绘制趋势线
              </Text>
            )}

            <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text className='text-secondary'>上次成绩: {lastScore}分</Text>
              <Text style={{ color: trendColor, fontSize: '26px', fontWeight: 'bold' }}>
                {isUp ? '+' : ''}{diff.toFixed(1)}分
              </Text>
            </View>

            {n > 0 && (
              <View style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                {item.historical_scores.map((s, i) => (
                  <Text
                    key={i}
                    style={{
                      fontSize: '20px',
                      color: '#999',
                      background: '#f5f5f5',
                      padding: '4px 10px',
                      borderRadius: '6px',
                    }}
                  >
                    {item.exam_dates?.[i] ? item.exam_dates[i].slice(5) + ' ' : ''}{s}分
                  </Text>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
