import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { analysisApi, authApi } from '../../api';
import { useAuthStore } from '../../stores/auth';

const FREE_PAPER_LIMIT = 2;

export default function StudentPapers() {
  const { user, setUser } = useAuthStore();
  const [reports, setReports] = useState<any[]>([]);

  const freeRemaining = Math.max(0, FREE_PAPER_LIMIT - (user?.free_paper_used || 0));
  const credits = user?.credits || 0;

  useEffect(() => {
    analysisApi.listReports().then((list: any[]) => {
      setReports(list.filter(r => r.report_type === 'paper_analysis'));
    });
  }, []);

  const handleAnalyze = async () => {
    if (freeRemaining <= 0 && credits <= 0) {
      Taro.showModal({
        title: '次数不足',
        content: '免费次数已用完，是否模拟充值10次？',
        confirmText: '充值',
      }).then(async res => {
        if (res.confirm) {
          const r = await authApi.recharge(10);
          setUser(r);
          Taro.showToast({ title: '充值成功', icon: 'success' });
        }
      });
      return;
    }

    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: () => {
        Taro.showToast({ title: '试卷已提交分析', icon: 'success' });
        authApi.getMe().then(setUser);
      },
      fail: () => {
        Taro.showToast({ title: '已取消', icon: 'none' });
      },
    });
  };

  return (
    <View className='container'>
      <View style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <Text className='tag tag-green'>免费 {freeRemaining}/{FREE_PAPER_LIMIT}</Text>
        <Text className='tag tag-gold'>额度 {credits} 次</Text>
      </View>

      <View className='card'>
        <Text className='subtitle'>上传试卷分析</Text>
        <Text className='text-secondary' style={{ display: 'block', marginBottom: '16px' }}>
          拍照或从相册选取试卷，AI将为你分析错题
        </Text>
        <View className='btn-primary' onClick={handleAnalyze}>拍照/选择试卷</View>
      </View>

      <Text className='subtitle' style={{ margin: '24px 0 16px' }}>分析记录</Text>
      {reports.length > 0 ? reports.map(r => (
        <View key={r.id} className='card' style={{ padding: '20px' }}
          onClick={() => Taro.showModal({ title: '分析详情', content: r.content.replace(/[#*`|]/g, '').slice(0, 500), showCancel: false })}>
          <View style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text className='tag tag-blue'>试卷分析</Text>
            <Text className='text-secondary'>{r.created_at?.slice(0, 10)}</Text>
          </View>
          <Text style={{ marginTop: '12px', fontSize: '26px', color: '#666' }}>
            {r.content.replace(/[#*`|]/g, '').slice(0, 100)}...
          </Text>
        </View>
      )) : <Text className='empty-text'>暂无分析记录</Text>}
    </View>
  );
}
