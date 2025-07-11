export interface Env {
  excaliapp: KVNamespace;
  excaliapp_db: D1Database;

  OIDC_USERINFO_URL: string; // URL for introspection endpoint
}

export interface ExcalidrawFile {
  id?: string;
  userId: string;
  name: string;
  data: string; // Serialized excaliapp data
  thumbnail?: string; // Base64 thumbnail
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;

  inStorage?: string;
}

export interface SaveFileRequest {
  id?: string;
  name?: string;
  data?: string;
  thumbnail?: string;
  isPublic?: boolean;
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Authorization, Content-Type",
        },
      });
    }

    try {
      const url = new URL(request.url);

      if (url.pathname === "/api/testing") {
        console.warn("Excalidraw API is working.");
        return Response.json({
          message: "Excalidraw API is working.",
        }, { status: 200 });
      }


      const authorizationHeader = request.headers.get("Authorization");
      const userinfoUrl = env.OIDC_USERINFO_URL;

      const trimmedToken = authorizationHeader?.replace("Bearer ", "").trim();
      if (!trimmedToken) {
        return new Response("Unauthorized", { status: 401 });
      }

      const userinfo = await fetch(userinfoUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${trimmedToken}`,
        }
      });

      if (!userinfo.ok) {
        return new Response("Unauthorized", { status: 401 });
      }

      const userData: any = await userinfo.json();

      if (!userData.email) {
        return Response.json({
          message: "User not found.",
        }, { status: 400 });
      }


      if (url.pathname === "/api/health/") {
        return Response.json({
          status: "ok",
          message: "Excalidraw API is healthy.",
        });
      }


      if (request.method === "GET" && url.pathname === "/api/drawings/") {
        const list = await env.excaliapp_db.prepare(
          `SELECT * FROM excaliapp WHERE userId = ?`
        );

        const files = await list.bind(userData.email).all<ExcalidrawFile>();

        if (!files || files.results.length === 0) {
          if (!files.error) {
            return Response.json({});
          }

          return Response.json({
            message: files.error,
          }, { status: 500 });
        }

        return Response.json(Object.fromEntries(
          files.results.map(file => [file.id, { ...file }])
        ));
      }

      if (request.method === "GET" && url.pathname.startsWith("/api/drawings/")) {
        let pathParts = url.pathname.split("/");
        let fileId = pathParts.pop();
        if (!fileId || fileId === "" || fileId === "undefined") {
          fileId = pathParts.pop();
        }

        const file = await env.excaliapp_db.prepare(
          `SELECT * FROM excaliapp WHERE id = ? AND userId = ?`
        ).bind(fileId, userData.email).first<ExcalidrawFile>();

        if (!file) {
          return Response.json({
            message: "File not found.",
          }, { status: 404 });
        }

        return Response.json(file);
      }

      if (request.method === "PUT" && url.pathname === "/api/drawings/") {
        const requestBody = await request.json() as SaveFileRequest;

        if (!requestBody.id || !requestBody.data || !requestBody.data) {
          return Response.json({
            message: "File ID, name and data are required.",
          }, { status: 400 });
        }

        const existingFile = await env.excaliapp_db.prepare(
          `SELECT * FROM excaliapp WHERE id = ?`
        ).bind(requestBody.id).first<ExcalidrawFile>();

        if (!existingFile) {
          const create = await env.excaliapp_db.prepare(
            `INSERT INTO excaliapp (id, userId, name, data, thumbnail, isPublic) 
            VALUES (?, ?, ?, ?, ?, ?)`
          ).bind(
            requestBody.id,
            userData.email,
            requestBody.name || "Untitled",
            requestBody.data,
            requestBody.thumbnail || null,
            requestBody.isPublic ?? false
          ).run();

          if (create.error) {
            return Response.json({
              message: create.error,
            }, { status: 500 });
          }

          if (create.success === true) {
            const file = await env.excaliapp_db.prepare(
              `SELECT * FROM excaliapp WHERE id = ? AND userId = ?`
            ).bind(requestBody.id, userData.email).first<ExcalidrawFile>();

            return Response.json(file, { status: 201 });
          }

          return Response.json({
            message: "Unknown error.",
          }, { status: 500 });

        }

        if (existingFile.userId !== userData.email) {
          return Response.json({
            message: "You do not have permission to edit this file.",
          }, { status: 403 });
        }

        const update = await env.excaliapp_db.prepare(
          `UPDATE excaliapp SET name = ?, data = ?, thumbnail = ?, isPublic = ? 
          WHERE id = ? AND userId = ?`
        ).bind(
          requestBody.name || existingFile.name,
          requestBody.data || existingFile.data,
          requestBody.thumbnail || existingFile.thumbnail,
          requestBody.isPublic ?? existingFile.isPublic,
          requestBody.id,
          userData.email
        ).run();

        if (update.error) {
          return Response.json({
            message: update.error,
          }, { status: 500 });
        }

        if (update.success) {
          const file = await env.excaliapp_db.prepare(
              `SELECT * FROM excaliapp WHERE id = ? AND userId = ?`
            ).bind(requestBody.id, userData.email).first<ExcalidrawFile>();

          return Response.json(file, { status: 200 });
        }

        return Response.json({
          message: "Unknown error occured",
        }, { status: 200 });
      }

      if (request.method === "DELETE" && url.pathname.startsWith("/api/drawings/")) {
        let pathParts = url.pathname.split("/");
        let fileId = pathParts.pop();
        if (!fileId || fileId === "" || fileId === "undefined") {
          fileId = pathParts.pop();
        }

        const existingFile = await env.excaliapp_db.prepare(
          `SELECT * FROM excaliapp WHERE id = ? AND userId = ?`
        ).bind(fileId, userData.email).first<ExcalidrawFile>();

        if (!existingFile) {
          return Response.json({
            message: "File not found.",
          }, { status: 404 });
        }

        const del = await env.excaliapp_db.prepare(
          `DELETE FROM excaliapp WHERE id = ? AND userId = ?`
        ).bind(fileId, userData.email).run();

        if (del.error) {
          return Response.json({
            message: del.error,
          }, { status: 500 });
        }

        return Response.json({
          message: "File deleted successfully.",
        }, { status: 200 });
      }

      return Response.json({
        message: "Method not allowed.",
      }, { status: 405 });
    } catch (error) {
      console.error("Error in fetch handler:", error);
      return Response.json({
        message: "Internal server error.",
        error: error instanceof Error ? error.message : String(error),
      }, { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;