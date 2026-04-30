export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/photographer/list/index',
    'pages/photographer/detail/index',
    'pages/order/create/index',
    'pages/order/list/index',
    'pages/order/detail/index',
    'pages/order/review/index',
    'pages/profile/index',
    'pages/login/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#1a1a1a',
    navigationBarTitleText: '约拍',
    navigationBarTextStyle: 'white',
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#1a1a1a',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页',
      },
      {
        pagePath: 'pages/order/list/index',
        text: '订单',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
      },
    ],
  },
});
