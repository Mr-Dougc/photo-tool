/**
 * 考试报名照片要求预设数据
 * 数据来源：各考试官方网站最新公告 (截至2025年)
 */
export const examPresets = [
  {
    id: 'guokao',
    name: '国考（国家公务员考试）',
    width: 130,
    height: 180,
    bgColor: '#4185D3',
    bgColors: ['#FFFFFF', '#4185D3'],
    fileSize: { min: 5, max: 50, unit: 'KB' },
    format: 'JPG/JPEG',
    note: '宽高比约1:1.385，蓝色或白色背景'
  },
  {
    id: 'cet46',
    name: '大学英语四六级（CET-4/6）',
    width: 192,
    height: 256,
    bgColor: '#FFFFFF',
    bgColors: ['#FFFFFF', '#4185D3'],
    fileSize: { min: 20, max: 200, unit: 'KB' },
    format: 'JPG',
    note: '宽高比3:4，蓝色或白色背景'
  },
  {
    id: 'shiye',
    name: '事业单位考试',
    width: 300,
    height: 400,
    bgColor: '#FFFFFF',
    bgColors: ['#FFFFFF', '#4185D3', '#E53E30'],
    fileSize: { min: 30, max: 100, unit: 'KB' },
    format: 'JPG/JPEG',
    note: '宽高比3:4，红蓝白背景均可'
  },
  {
    id: 'jiaoshi',
    name: '教师资格证',
    width: 295,
    height: 413,
    bgColor: '#FFFFFF',
    bgColors: ['#FFFFFF'],
    fileSize: { min: 0, max: 200, unit: 'KB' },
    format: 'JPG/JPEG',
    note: '宽高比约5:7，纯白背景，近6个月内免冠正面照'
  },
  {
    id: 'ruankao',
    name: '软考（计算机技术与软件专业技术资格）',
    width: 295,
    height: 413,
    bgColor: '#FFFFFF',
    bgColors: ['#FFFFFF'],
    fileSize: { min: 5, max: 50, unit: 'KB' },
    format: 'JPG/JPEG',
    note: '宽高比约5:7，白色背景，免冠正面照'
  },
  {
    id: 'jundui',
    name: '军队文职',
    width: 300,
    height: 400,
    bgColor: '#4185D3',
    bgColors: ['#FFFFFF', '#4185D3', '#E53E30'],
    fileSize: { min: 5, max: 50, unit: 'KB' },
    format: 'JPG/JPEG',
    note: '宽高比3:4，红蓝白背景均可'
  },
  {
    id: 'lvshi',
    name: '律师职业资格考试',
    width: 390,
    height: 567,
    bgColor: '#4185D3',
    bgColors: ['#FFFFFF', '#4185D3'],
    fileSize: { min: 40, max: 100, unit: 'KB' },
    format: 'JPG/JPEG',
    note: '宽高比约2:3，蓝色或白色背景'
  },
  {
    id: 'yjs',
    name: '研究生考试',
    width: 150,
    height: 200,
    bgColor: '#FFFFFF',
    bgColors: ['#FFFFFF'],
    fileSize: { min: 5, max: 50, unit: 'KB' },
    format: 'JPG',
    note: '宽高比3:4，白色背景，近期免冠照'
  },
  {
    id: 'hukao',
    name: '护考（护士执业资格考试）',
    width: 295,
    height: 413,
    bgColor: '#FFFFFF',
    bgColors: ['#FFFFFF'],
    fileSize: { min: 5, max: 50, unit: 'KB' },
    format: 'JPG/JPEG',
    note: '宽高比约5:7，白色背景'
  },
  {
    id: 'cpa',
    name: '注册会计师（CPA）',
    width: 178,
    height: 220,
    bgColor: '#FFFFFF',
    bgColors: ['#FFFFFF'],
    fileSize: { min: 2, max: 20, unit: 'KB' },
    format: 'JPG/JPEG',
    note: '宽高比约4:5，白色背景，近1年免冠照'
  },
  {
    id: 'fakao',
    name: '法律职业资格考试（法考）',
    width: 413,
    height: 626,
    bgColor: '#4185D3',
    bgColors: ['#4185D3'],
    fileSize: { min: 40, max: 100, unit: 'KB' },
    format: 'JPG/JPEG',
    note: '宽高比约2:3，蓝色背景'
  },
  {
    id: 'gwy',
    name: '各省公务员考试',
    width: 130,
    height: 180,
    bgColor: '#4185D3',
    bgColors: ['#FFFFFF', '#4185D3'],
    fileSize: { min: 5, max: 50, unit: 'KB' },
    format: 'JPG/JPEG',
    note: '宽高比约1:1.385，蓝色或白色背景'
  }
]

/** 背景色映射 */
export const bgColorMap = {
  '#FFFFFF': { name: '白色', hex: '#FFFFFF' },
  '#4185D3': { name: '蓝色', hex: '#4185D3' },
  '#E53E30': { name: '红色', hex: '#E53E30' }
}

export const bgColorList = [
  { name: '白色', hex: '#FFFFFF' },
  { name: '蓝色', hex: '#4185D3' },
  { name: '红色', hex: '#E53E30' }
]
