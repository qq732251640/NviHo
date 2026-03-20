import Taro from '@tarojs/taro';

// 本地开发用局域网 IP
// const BASE_URL = 'http://172.17.8.225:8000/api';
// 正式环境：复用已备案域名
const BASE_URL = 'https://www.xinweijia.net/api';

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
      Taro.redirectTo({ url: '/pages/login/index' });
      throw new Error('未登录');
    }

    if (res.statusCode === 403) {
      throw { status: 403, detail: res.data?.detail || '权限不足或次数已用完' };
    }

    if (res.statusCode >= 400) {
      throw { status: res.statusCode, detail: res.data?.detail || '请求失败' };
    }

    return res.data as T;
  } catch (err: any) {
    if (err.status) throw err;
    throw { status: 0, detail: '网络错误' };
  }
}

export async function uploadFile(options: {
  url: string;
  filePath: string;
  name: string;
  formData?: Record<string, string>;
}): Promise<any> {
  const token = Taro.getStorageSync('access_token');
  const res = await Taro.uploadFile({
    url: `${BASE_URL}${options.url}`,
    filePath: options.filePath,
    name: options.name,
    formData: options.formData,
    header: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (res.statusCode >= 400) {
    const data = JSON.parse(res.data || '{}');
    throw { status: res.statusCode, detail: data.detail || '上传失败' };
  }
  return JSON.parse(res.data || '{}');
}
