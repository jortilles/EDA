export function ExposeMethod() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    if (!target.__exposedMethods) {
      target.__exposedMethods = [];
    }
    target.__exposedMethods.push(propertyKey);
  };
}