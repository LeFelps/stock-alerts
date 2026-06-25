# Feature modules with internal layers

We organize product code by feature modules under `src/features`, with each
module owning its domain, application ports/use cases, infrastructure adapters,
server adapters, and feature UI. This gives the MVP explicit contracts and safer
boundaries than route-centric code while avoiding the ceremony of global
domain/application/infrastructure layers before the product model is larger.
