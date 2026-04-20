export interface SellerReview {
  id: string;
  seller_id: string;
  reviewer_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  created_at: string;
  reviewer?: {
    first_name: string;
    last_name: string;
  };
}
export interface SellerReputation {
  seller_id: string;
  total_reviews: number;
  average_rating: number;
  five_star: number;
  four_star: number;
  three_star: number;
  two_star: number;
  one_star: number;
}