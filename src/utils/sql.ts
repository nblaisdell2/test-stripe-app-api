import { Request } from "express";
import sql from "mssql";

let CONFIG: sql.config = { server: "" };

// Callback function when connecting to SQL Server
const onBeforeConnect = (conn: sql.Connection) => {
  conn.once("connect", (err) => {
    err ? console.error(err) : console.log("mssql connected");
  });
  conn.once("end", (err) => {
    err ? console.error(err) : console.log("mssql disconnected");
  });
};

// Gets the 'mssql' configuration for connecting to our database
// Caches the config so only assembled once
const getConfig = (): sql.config => {
  if (!CONFIG.server) {
    CONFIG = {
      user: process.env.DB_USER,
      password: process.env.DB_PWD,
      database: process.env.DB_NAME,
      server: process.env.DB_HOST as string,
      // port: 1433, // default to 1433
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
      options: {
        encrypt: false, // for azure
        trustServerCertificate: true, // change to true for local dev / self-signed certs
        trustedConnection: false, // default = false (Windows Authentication)
      },
      beforeConnect: onBeforeConnect,
    };
  }

  return CONFIG;
};

export type QueryParams = {
  name: string;
  value: any;
};

export type QueryResponse = {
  resultCount: number;
  resultData: any[] | any | null;
};

// Creates a single instance of a ConnectionPool, which can be shared
// with our other queries, instead of relying on the global pool
export async function createSharedConnectionPool(): Promise<sql.ConnectionPool> {
  const appPool = new sql.ConnectionPool(getConfig());
  return await appPool.connect();
}

// If the shared connection pool is available, use it.
// Otherwise, use the global connection pool
async function getConnectionPool(req: Request): Promise<sql.ConnectionPool> {
  if (req?.app?.locals?.db) {
    // console.log("Getting connection from SHARED pool");
    return await req.app.locals.db.connect(getConfig());
  } else {
    // console.log("Getting connection from GLOBAL pool");
    return await sql.connect(getConfig());
  }
}

// Executes a stored procedure after assembling its parameters,
// and returns the results from the stored procedure
async function getSQLServerResponse(
  req: Request,
  spName: string,
  params: QueryParams[]
) {
  let pool = await getConnectionPool(req);
  let sqlReq = pool.request();
  for (let i = 0; i < params.length; i++) {
    sqlReq.input(params[i].name, params[i].value);
  }
  return await sqlReq.execute(spName);
}

// Creates the QueryResponse object based on the results
// returned from a stored procedure
function getQueryResponse(res: sql.IProcedureResult<any>) {
  let queryResponse: QueryResponse = {
    resultCount: 0,
    resultData: null,
  };
  queryResponse.resultCount = res.recordsets.length as number;
  if (queryResponse.resultCount > 1) {
    // "multiple results";
    queryResponse.resultData = (res.recordsets as any[]).map((ar) => {
      return ar[0];
    });
  } else {
    let resKeys = Object.keys(res.recordset[0]);
    if (resKeys.length > 1) {
      // "single result";
      queryResponse.resultData = res.recordset[0];
    } else {
      // "scalar";
      queryResponse.resultData = res.recordset[0][resKeys[0]];
    }
  }

  return queryResponse;
}

// Execute a stored procedure, with no return value
export async function execute(
  req: Request,
  spName: string,
  params: QueryParams[]
): Promise<void> {
  await getSQLServerResponse(req, spName, params);
}

// Execute a stored procedure, and retreive the
// results from the stored procedure
export async function query(
  req: Request,
  spName: string,
  params: QueryParams[]
): Promise<QueryResponse> {
  const res = await getSQLServerResponse(req, spName, params);
  return getQueryResponse(res);
}
