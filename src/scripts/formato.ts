// Formato de tiempo para el reproductor (spec §3 fila 5, §6). Única
// responsabilidad: convertir segundos a "m:ss". Valores no reproducibles
// (NaN, Infinity, 0 o negativos) no tienen un tiempo que mostrar: se
// devuelve el placeholder en vez de "NaN:NaN" o "-1:00".
export function formatoTiempo(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos <= 0) return "--:--";
  const minutos = Math.floor(segundos / 60);
  const resto = Math.floor(segundos % 60);
  return `${minutos}:${String(resto).padStart(2, "0")}`;
}
