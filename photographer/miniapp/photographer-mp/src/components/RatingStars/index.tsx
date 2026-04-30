import { View, Text } from '@tarojs/components';
import './index.scss';

interface Props {
  rating: number;
  size?: number;
  showValue?: boolean;
  count?: number;
}

export default function RatingStars({ rating, size = 24, showValue = true, count }: Props) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <View className="rating-stars" style={{ fontSize: `${size}px` }}>
      {Array.from({ length: full }).map((_, i) => (
        <Text key={`f${i}`} className="star full">★</Text>
      ))}
      {half && <Text className="star half">★</Text>}
      {Array.from({ length: empty }).map((_, i) => (
        <Text key={`e${i}`} className="star empty">★</Text>
      ))}
      {showValue && <Text className="rating-value">{rating.toFixed(1)}</Text>}
      {count !== undefined && <Text className="rating-count">({count})</Text>}
    </View>
  );
}
