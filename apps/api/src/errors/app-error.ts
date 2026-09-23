export class AppError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: string,
    /** Campos recusados na validação, para a interface destacar cada um. */
    readonly fields?: Record<string, string[]>
  ) {
    super(message);
    this.name = "AppError";
  }
}
