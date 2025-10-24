export interface ErrorResponse {
  type?: string;
  title: string;
  detail: string | string[];
  instance: string;
}
