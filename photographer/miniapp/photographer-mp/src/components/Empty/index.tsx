import { View } from '@tarojs/components';
import './index.scss';

interface Props {
  text?: string;
  icon?: string;
}

export default function Empty({ text = '暂无内容', icon = '📷' }: Props) {
  return (
    <View className="empty-state">
      <View className="empty-icon">{icon}</View>
      <View className="empty-text">{text}</View>
    </View>
  );
}
