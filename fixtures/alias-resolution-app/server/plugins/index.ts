export function registerPlugins(app: { decorate?: (name: string, value: string) => void }): void {
  app.decorate?.("serviceName", "alias-resolution-app");
}
