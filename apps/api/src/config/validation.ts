import { z } from "zod";

/**
 * Mensagens de validação em português. Importado cedo pelo app para que todo
 * erro devolvido ao usuário já saia no idioma do produto.
 */
export function configurarValidacao(): void {
  z.config(z.locales.pt());
}
