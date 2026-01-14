import { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Demanda } from '../../types';

interface WBSGraphProps {
  demandas: Demanda[];
}

export function WBSGraph({ demandas }: WBSGraphProps) {
  const data = useMemo(() => {
    const grouped = demandas.reduce((acc, curr) => {
      const project = curr.Projeto || '미지정';
      if (!acc[project]) {
        acc[project] = { 
          name: project, 
          대기: 0, 
          진행중: 0, 
          완료: 0,
          total: 0
        };
      }
      
      if (curr.Status === 'Demandas em Fila') acc[project].대기 += 1;
      else if (curr.Status === 'Demandas Pendentes') acc[project].진행중 += 1;
      else if (curr.Status === 'Demandas Resolvidas') acc[project].완료 += 1;
      
      acc[project].total += 1;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped)
      .sort((a: any, b: any) => b.total - a.total); // 전체 건수 많은 순 정렬
  }, [demandas]);

  // 진행률 계산
  const progressData = data.map((d: any) => ({
    ...d,
    progress: d.total > 0 ? Math.round((d.완료 / d.total) * 100) : 0
  }));

  if (progressData.length === 0) {
    return (
        <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
            데이터가 없습니다.
        </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 메인 차트: 프로젝트별 상태 현황 (Stacked Bar) */}
      <div className="lg:col-span-2">
        <ResponsiveContainer width="100%" height={300} minWidth={0}>
          <BarChart
            data={progressData}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12, fill: '#6b7280' }} 
                axisLine={false}
                tickLine={false}
            />
            <YAxis 
                tick={{ fontSize: 12, fill: '#6b7280' }} 
                axisLine={false}
                tickLine={false}
            />
            <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f3f4f6' }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Bar dataKey="대기" stackId="a" fill="#94a3b8" radius={[0, 0, 0, 0]} barSize={40} />
            <Bar dataKey="진행중" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={40} />
            <Bar dataKey="완료" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 서브 정보: 프로젝트별 진행률 */}
      <div className="lg:col-span-1 border-l pl-0 lg:pl-6 space-y-4 overflow-y-auto max-h-[300px] pr-2">
        <h4 className="font-semibold text-sm text-gray-700 mb-2">프로젝트별 달성도</h4>
        <div className="space-y-4">
            {progressData.map((item: any) => (
                <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                        <span className="font-medium text-gray-700 truncate max-w-[150px]" title={item.name}>{item.name}</span>
                        <span className="text-gray-500">{item.progress}% ({item.완료}/{item.total})</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-teal-500 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${item.progress}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
