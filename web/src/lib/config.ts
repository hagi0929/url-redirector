import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

export function usePublicBaseURL(): string {
  const { data } = useQuery({
    queryKey: ["config"],
    queryFn: api.config,
    staleTime: Infinity,
  });
  return data?.public_base_url ?? "";
}
