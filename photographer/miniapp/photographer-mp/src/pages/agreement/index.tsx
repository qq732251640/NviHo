import { useEffect, useState } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { Text, View } from '@tarojs/components';

import { AgreementContent } from '@/types';
import { getAgreement } from '@/api/agreements';
import './index.scss';

const TYPE_TITLES: Record<string, string> = {
  user: '用户协议',
  photographer: '摄影师入驻协议',
  service_commitment: '服务承诺书',
};

export default function AgreementPage() {
  const router = useRouter();
  const type = (router.params.type || 'user') as
    | 'user'
    | 'photographer'
    | 'service_commitment';

  const [doc, setDoc] = useState<AgreementContent | null>(null);

  useEffect(() => {
    Taro.setNavigationBarTitle({ title: TYPE_TITLES[type] || '协议' });
    (async () => {
      try {
        const d = await getAgreement(type);
        setDoc(d);
      } catch (e: any) {
        Taro.showToast({ title: e.detail || '加载失败', icon: 'none' });
      }
    })();
  }, [type]);

  if (!doc) {
    return <View className="loading">加载中...</View>;
  }

  // 简易 markdown 渲染:按行处理标题和段落
  const lines = doc.content_md.split('\n');
  return (
    <View className="agreement-page">
      <View className="meta">
        <Text className="version">版本 {doc.version}</Text>
        <Text className="date"> · 生效 {doc.effective_date}</Text>
      </View>
      <View className="content">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return <View key={i} className="blank" />;
          if (trimmed.startsWith('# ')) {
            return <View key={i} className="h1">{trimmed.slice(2)}</View>;
          }
          if (trimmed.startsWith('## ')) {
            return <View key={i} className="h2">{trimmed.slice(3)}</View>;
          }
          if (trimmed.startsWith('### ')) {
            return <View key={i} className="h3">{trimmed.slice(4)}</View>;
          }
          if (trimmed.startsWith('#### ')) {
            return <View key={i} className="h4">{trimmed.slice(5)}</View>;
          }
          if (trimmed.startsWith('> ')) {
            return <View key={i} className="quote">{trimmed.slice(2)}</View>;
          }
          if (trimmed.startsWith('- ')) {
            return <View key={i} className="li">· {trimmed.slice(2)}</View>;
          }
          if (trimmed.startsWith('|')) {
            return <View key={i} className="table-line">{trimmed}</View>;
          }
          if (trimmed.startsWith('---')) {
            return <View key={i} className="hr" />;
          }
          // 加粗简单处理:**xxx** -> 黑体
          if (trimmed.includes('**')) {
            const parts = trimmed.split('**');
            return (
              <View key={i} className="p">
                {parts.map((part, j) =>
                  j % 2 === 1 ? (
                    <Text key={j} className="bold">{part}</Text>
                  ) : (
                    <Text key={j}>{part}</Text>
                  )
                )}
              </View>
            );
          }
          return <View key={i} className="p">{trimmed}</View>;
        })}
      </View>
    </View>
  );
}
