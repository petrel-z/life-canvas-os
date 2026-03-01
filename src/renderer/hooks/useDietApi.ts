/**
 * 饮食系统 API 业务逻辑层
 */

import { useCallback } from 'react';
import { toast } from 'sonner';
import { dietApi, FuelBaseline, MealDeviation, MealDeviationCreate, MealItem } from '~/renderer/api/diet';

// 前端使用的偏离事件类型
export interface Deviation {
  id: string;
  timestamp: number;
  description: string;
  type: 'excess' | 'deficit' | 'other';
}

// 前端使用的基准数据类型
export interface BaselineData {
  breakfast: string[];
  lunch: string[];
  dinner: string[];
  taste: string[];
}

export function useDietApi() {
  /**
   * 获取饮食基准
   */
  const getBaseline = useCallback(async (): Promise<BaselineData | null> => {
    const response = await dietApi.getBaseline();

    if (!response.ok) {
      const error = await response.json();
      // 404 表示基准还未设置，不算错误
      if (response.status === 404) {
        return null;
      }
      toast.error('获取饮食基准失败', {
        description: error.detail?.message || '请稍后重试',
      });
      throw error;
    }

    const result = await response.json();
    const data = result.data as FuelBaseline;

    // 转换后端格式到前端格式
    return {
      breakfast: data.breakfast?.map(item => item.name) || [],
      lunch: data.lunch?.map(item => item.name) || [],
      dinner: data.dinner?.map(item => item.name) || [],
      taste: data.taste || [],
    };
  }, []);

  /**
   * 更新饮食基准
   */
  const updateBaseline = useCallback(async (data: BaselineData): Promise<BaselineData> => {
    // 转换前端格式到后端格式
    const apiData = {
      breakfast: data.breakfast.map(name => ({ name })),
      lunch: data.lunch.map(name => ({ name })),
      dinner: data.dinner.map(name => ({ name })),
      taste: data.taste,
    };

    const response = await dietApi.updateBaseline(apiData);

    if (!response.ok) {
      const error = await response.json();
      toast.error('更新饮食基准失败', {
        description: error.detail?.message || '请稍后重试',
      });
      throw error;
    }

    const result = await response.json();
    const resultData = result.data as FuelBaseline;

    toast.success('饮食基准更新成功');

    // 转换后端响应到前端格式
    return {
      breakfast: resultData.breakfast?.map(item => item.name) || [],
      lunch: resultData.lunch?.map(item => item.name) || [],
      dinner: resultData.dinner?.map(item => item.name) || [],
      taste: resultData.taste || [],
    };
  }, []);

  /**
   * 创建偏离事件
   */
  const createDeviation = useCallback(async (description: string): Promise<Deviation> => {
    const apiData: MealDeviationCreate = {
      description,
    };

    const response = await dietApi.createDeviation(apiData);

    if (!response.ok) {
      const error = await response.json();
      toast.error('创建偏离事件失败', {
        description: error.detail?.message || '请稍后重试',
      });
      throw error;
    }

    const result = await response.json();
    const data = result.data as MealDeviation;

    toast.success('偏离事件已记录');

    // 转换后端响应到前端格式
    return {
      id: data.id.toString(),
      timestamp: data.occurred_at_ts,
      description: data.description,
      type: 'other',
    };
  }, []);

  /**
   * 获取偏离事件列表
   */
  const getDeviations = useCallback(async (params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<{ deviations: Deviation[]; total?: number }> => {
    // 总是传递 page 和 page_size
    const requestParams = {
      page: 1,
      page_size: 100,
      ...params,
    };

    const response = await dietApi.getDeviations(requestParams);

    if (!response.ok) {
      const error = await response.json();
      toast.error('获取偏离事件列表失败', {
        description: error.detail?.message || '请稍后重试',
      });
      throw error;
    }

    const result = await response.json();
    const data = result.data as { items: MealDeviation[]; total: number };

    // 转换后端响应到前端格式
    const deviations: Deviation[] = data.items.map(item => ({
      id: item.id.toString(),
      timestamp: item.occurred_at_ts,
      description: item.description,
      type: 'other',
    }));

    // 按时间倒序排列（最新的在前）
    deviations.sort((a, b) => b.timestamp - a.timestamp);

    return {
      deviations,
      total: data.total,
    };
  }, []);

  /**
   * 删除偏离事件
   */
  const deleteDeviation = useCallback(async (id: string): Promise<void> => {
    const response = await dietApi.deleteDeviation(parseInt(id));

    if (!response.ok) {
      const error = await response.json();
      toast.error('删除偏离事件失败', {
        description: error.detail?.message || '请稍后重试',
      });
      throw error;
    }

    toast.success('偏离事件已删除');
  }, []);

  return {
    getBaseline,
    updateBaseline,
    createDeviation,
    getDeviations,
    deleteDeviation,
  };
}
