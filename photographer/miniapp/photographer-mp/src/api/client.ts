import Taro from '@tarojs/taro';

// 开发: 模拟器走 localhost,真机调试需改成 Mac 局域网 IP(如 http://192.168.1.100:8001/api/pm)
// 生产: 服务器部署后走 xinweijia.net
const BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://www.xinweijia.net/api/pm'
    : 'http://localhost:8001/api/pm';

console.log(
  `%c[API] ${process.env.NODE_ENV} 模式 -> ${BASE_URL}`,
  'background: #1a1a1a; color: #c89b6a; padding: 2px 6px; border-radius: 3px;'
);

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  header?: Record<string, string>;
}

export async function request<T = any>(options: RequestOptions): Promise<T> {
  const token = Taro.getStorageSync('access_token');
  const header: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.header,
  };
  if (token) {
    header['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await Taro.request({
      url: `${BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header,
    });

    if (res.statusCode === 401) {
      Taro.removeStorageSync('access_token');
      Taro.removeStorageSync('user_info');
      Taro.navigateTo({ url: '/pages/login/index' });
      throw { status: 401, detail: '请先登录' };
    }

    if (res.statusCode >= 400) {
      const detail = (res.data as any)?.detail || '请求失败';
      throw { status: res.statusCode, detail };
    }

    return res.data as T;
  } catch (err: any) {
    if (err.status) throw err;
    throw { status: 0, detail: '网络错误' };
  }
}

export const BASE_URL_EXPORT = BASE_URL;

export function resolveImageUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const origin = BASE_URL.replace(/\/api\/pm$/, '');
  return `${origin}${url}`;
}

export function fmtPrice(cents: number): string {
  return (cents / 100).toFixed(0);
}

export function fmtPriceFloat(cents: number): string {
  return (cents / 100).toFixed(2);
}
