
import { Document, QAPair } from './types';

export const MOCK_DOCUMENTS: Document[] = [
  {
    id: 'doc-1',
    name: 'Bo_luat_hinh_su_2015_sua_doi_2017.pdf',
    size: '2.4 MB',
    uploadDate: '2023-10-15',
    totalSamples: 12,
    reviewedSamples: 5,
    status: 'Ready',
  },
  {
    id: 'doc-2',
    name: 'Luat_Giao_thong_duong_bo.docx',
    size: '1.1 MB',
    uploadDate: '2023-10-18',
    totalSamples: 8,
    reviewedSamples: 0,
    status: 'Ready',
  }
];

export const MOCK_QA_PAIRS: Record<string, QAPair[]> = {
  'doc-1': [
    {
      id: 'qa-1-1',
      docId: 'doc-1',
      question: 'Tội phạm là gì theo Bộ luật Hình sự Việt Nam?',
      answer: 'Tội phạm là hành vi nguy hiểm cho xã hội được quy định trong Bộ luật hình sự, do người có năng lực trách nhiệm hình sự hoặc pháp nhân thương mại thực hiện một cách cố ý hoặc vô ý, xâm phạm độc lập, chủ quyền, thống nhất, toàn vẹn lãnh thổ Tổ quốc, xâm phạm chế độ chính trị, chế độ kinh tế...',
      status: 'Reviewed',
    },
    {
      id: 'qa-1-2',
      docId: 'doc-1',
      question: 'Thế nào là lỗi vô ý do cẩu thả?',
      answer: 'Lỗi vô ý do cẩu thả là trường hợp người phạm tội không thấy trước hành vi của mình có thể gây ra hậu quả nguy hại cho xã hội, mặc dù phải thấy trước và có thể thấy trước hậu quả đó.',
      status: 'Pending',
    },
    {
      id: 'qa-1-3',
      docId: 'doc-1',
      question: 'Độ tuổi chịu trách nhiệm hình sự là bao nhiêu?',
      answer: 'Người từ đủ 16 tuổi trở lên phải chịu trách nhiệm hình sự về mọi tội phạm. Người từ đủ 14 tuổi đến dưới 16 tuổi phải chịu trách nhiệm hình sự về tội phạm rất nghiêm trọng hoặc đặc biệt nghiêm trọng được quy định cụ thể.',
      status: 'Edited',
    }
  ],
  'doc-2': [
    {
      id: 'qa-2-1',
      docId: 'doc-2',
      question: 'Mức phạt vi phạm nồng độ cồn đối với xe máy là bao nhiêu?',
      answer: 'Theo Nghị định 100/2019/NĐ-CP, mức phạt tiền cao nhất đối với người điều khiển xe máy có nồng độ cồn vượt quá 80mg/100ml máu hoặc 0.4mg/1 lít khí thở là từ 6-8 triệu đồng và tước bằng lái từ 22-24 tháng.',
      status: 'Pending',
    }
  ]
};
