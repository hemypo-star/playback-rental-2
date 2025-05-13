
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  getPromotions, 
  createPromotion, 
  updatePromotion, 
  deletePromotion,
  reorderPromotions
} from "@/services/promotionService";
import { PromotionFormValues } from "@/types/promotion";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";

export const usePromotionManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Query to get all promotions
  const promotionsQuery = useQuery({
    queryKey: ['promotions'],
    queryFn: getPromotions
  });

  // Add promotion mutation
  const addPromotionMutation = useMutation({
    mutationFn: async (promotionData: PromotionFormValues) => {
      setIsLoading(true);
      try {
        return await createPromotion(promotionData);
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast({
        title: "Акция добавлена",
        description: "Новая акция успешно добавлена в слайдер",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось добавить акцию: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update promotion mutation
  const updatePromotionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PromotionFormValues }) => {
      setIsLoading(true);
      try {
        return await updatePromotion(id, data);
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast({
        title: "Акция обновлена",
        description: "Акция успешно обновлена",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось обновить акцию: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete promotion mutation
  const deletePromotionMutation = useMutation({
    mutationFn: deletePromotion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast({
        title: "Акция удалена",
        description: "Акция успешно удалена из слайдера",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось удалить акцию: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Reorder promotions mutation
  const reorderPromotionsMutation = useMutation({
    mutationFn: reorderPromotions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast({
        title: "Порядок изменен",
        description: "Порядок акций успешно обновлен",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось изменить порядок акций: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    promotions: promotionsQuery.data || [],
    isLoading: isLoading || promotionsQuery.isLoading,
    isError: promotionsQuery.isError,
    error: promotionsQuery.error,
    refetch: promotionsQuery.refetch,
    addPromotion: addPromotionMutation.mutate,
    updatePromotion: updatePromotionMutation.mutate,
    deletePromotion: deletePromotionMutation.mutate,
    reorderPromotions: reorderPromotionsMutation.mutate
  };
};
