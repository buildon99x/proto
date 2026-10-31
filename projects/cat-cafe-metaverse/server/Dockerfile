# Build context: projects/cat-cafe-metaverse. Recipe not built/run here.
FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /opt/cat-cafe/server
COPY --chown=node:node server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --chown=node:node server/index.mjs server/config.mjs server/world.mjs ./
COPY --chown=node:node shared/ /opt/cat-cafe/shared/
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "index.mjs"]
