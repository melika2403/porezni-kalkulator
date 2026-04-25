
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model Subscription
 * 
 */
export type Subscription = $Result.DefaultSelection<Prisma.$SubscriptionPayload>
/**
 * Model Organization
 * 
 */
export type Organization = $Result.DefaultSelection<Prisma.$OrganizationPayload>
/**
 * Model Worker
 * 
 */
export type Worker = $Result.DefaultSelection<Prisma.$WorkerPayload>
/**
 * Model OrganizationMember
 * 
 */
export type OrganizationMember = $Result.DefaultSelection<Prisma.$OrganizationMemberPayload>
/**
 * Model Client
 * 
 */
export type Client = $Result.DefaultSelection<Prisma.$ClientPayload>
/**
 * Model Form
 * 
 */
export type Form = $Result.DefaultSelection<Prisma.$FormPayload>
/**
 * Model FormVersion
 * 
 */
export type FormVersion = $Result.DefaultSelection<Prisma.$FormVersionPayload>
/**
 * Model FormAttachment
 * 
 */
export type FormAttachment = $Result.DefaultSelection<Prisma.$FormAttachmentPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const OrganizationRole: {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER'
};

export type OrganizationRole = (typeof OrganizationRole)[keyof typeof OrganizationRole]


export const ClientType: {
  PERSON: 'PERSON',
  COMPANY: 'COMPANY'
};

export type ClientType = (typeof ClientType)[keyof typeof ClientType]


export const FormStatus: {
  DRAFT: 'DRAFT',
  GENERATED: 'GENERATED',
  SUBMITTED: 'SUBMITTED',
  ARCHIVED: 'ARCHIVED'
};

export type FormStatus = (typeof FormStatus)[keyof typeof FormStatus]


export const OrganizationType: {
  COMPANY: 'COMPANY',
  BUSINESS: 'BUSINESS'
};

export type OrganizationType = (typeof OrganizationType)[keyof typeof OrganizationType]


export const WorkerRole: {
  VLASNIK: 'VLASNIK',
  RADNIK: 'RADNIK'
};

export type WorkerRole = (typeof WorkerRole)[keyof typeof WorkerRole]


export const forms_type: {
  GPD: 'GPD',
  SPR: 'SPR',
  ZO3: 'ZO3',
  UGOVOR: 'UGOVOR',
  PLDI: 'PLDI',
  AMS: 'AMS'
};

export type forms_type = (typeof forms_type)[keyof typeof forms_type]


export const users_role: {
  USER: 'USER',
  PRO: 'PRO',
  BUSINESS: 'BUSINESS',
  ADMIN: 'ADMIN'
};

export type users_role = (typeof users_role)[keyof typeof users_role]

}

export type OrganizationRole = $Enums.OrganizationRole

export const OrganizationRole: typeof $Enums.OrganizationRole

export type ClientType = $Enums.ClientType

export const ClientType: typeof $Enums.ClientType

export type FormStatus = $Enums.FormStatus

export const FormStatus: typeof $Enums.FormStatus

export type OrganizationType = $Enums.OrganizationType

export const OrganizationType: typeof $Enums.OrganizationType

export type WorkerRole = $Enums.WorkerRole

export const WorkerRole: typeof $Enums.WorkerRole

export type forms_type = $Enums.forms_type

export const forms_type: typeof $Enums.forms_type

export type users_role = $Enums.users_role

export const users_role: typeof $Enums.users_role

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.subscription`: Exposes CRUD operations for the **Subscription** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Subscriptions
    * const subscriptions = await prisma.subscription.findMany()
    * ```
    */
  get subscription(): Prisma.SubscriptionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.organization`: Exposes CRUD operations for the **Organization** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Organizations
    * const organizations = await prisma.organization.findMany()
    * ```
    */
  get organization(): Prisma.OrganizationDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.worker`: Exposes CRUD operations for the **Worker** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Workers
    * const workers = await prisma.worker.findMany()
    * ```
    */
  get worker(): Prisma.WorkerDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.organizationMember`: Exposes CRUD operations for the **OrganizationMember** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more OrganizationMembers
    * const organizationMembers = await prisma.organizationMember.findMany()
    * ```
    */
  get organizationMember(): Prisma.OrganizationMemberDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.client`: Exposes CRUD operations for the **Client** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Clients
    * const clients = await prisma.client.findMany()
    * ```
    */
  get client(): Prisma.ClientDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.form`: Exposes CRUD operations for the **Form** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Forms
    * const forms = await prisma.form.findMany()
    * ```
    */
  get form(): Prisma.FormDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.formVersion`: Exposes CRUD operations for the **FormVersion** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more FormVersions
    * const formVersions = await prisma.formVersion.findMany()
    * ```
    */
  get formVersion(): Prisma.FormVersionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.formAttachment`: Exposes CRUD operations for the **FormAttachment** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more FormAttachments
    * const formAttachments = await prisma.formAttachment.findMany()
    * ```
    */
  get formAttachment(): Prisma.FormAttachmentDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.19.3
   * Query Engine version: c2990dca591cba766e3b7ef5d9e8a84796e47ab7
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    User: 'User',
    Subscription: 'Subscription',
    Organization: 'Organization',
    Worker: 'Worker',
    OrganizationMember: 'OrganizationMember',
    Client: 'Client',
    Form: 'Form',
    FormVersion: 'FormVersion',
    FormAttachment: 'FormAttachment'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "user" | "subscription" | "organization" | "worker" | "organizationMember" | "client" | "form" | "formVersion" | "formAttachment"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      Subscription: {
        payload: Prisma.$SubscriptionPayload<ExtArgs>
        fields: Prisma.SubscriptionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SubscriptionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SubscriptionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>
          }
          findFirst: {
            args: Prisma.SubscriptionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SubscriptionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>
          }
          findMany: {
            args: Prisma.SubscriptionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>[]
          }
          create: {
            args: Prisma.SubscriptionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>
          }
          createMany: {
            args: Prisma.SubscriptionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.SubscriptionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>
          }
          update: {
            args: Prisma.SubscriptionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>
          }
          deleteMany: {
            args: Prisma.SubscriptionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SubscriptionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.SubscriptionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>
          }
          aggregate: {
            args: Prisma.SubscriptionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSubscription>
          }
          groupBy: {
            args: Prisma.SubscriptionGroupByArgs<ExtArgs>
            result: $Utils.Optional<SubscriptionGroupByOutputType>[]
          }
          count: {
            args: Prisma.SubscriptionCountArgs<ExtArgs>
            result: $Utils.Optional<SubscriptionCountAggregateOutputType> | number
          }
        }
      }
      Organization: {
        payload: Prisma.$OrganizationPayload<ExtArgs>
        fields: Prisma.OrganizationFieldRefs
        operations: {
          findUnique: {
            args: Prisma.OrganizationFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.OrganizationFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>
          }
          findFirst: {
            args: Prisma.OrganizationFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.OrganizationFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>
          }
          findMany: {
            args: Prisma.OrganizationFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>[]
          }
          create: {
            args: Prisma.OrganizationCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>
          }
          createMany: {
            args: Prisma.OrganizationCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.OrganizationDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>
          }
          update: {
            args: Prisma.OrganizationUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>
          }
          deleteMany: {
            args: Prisma.OrganizationDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.OrganizationUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.OrganizationUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>
          }
          aggregate: {
            args: Prisma.OrganizationAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateOrganization>
          }
          groupBy: {
            args: Prisma.OrganizationGroupByArgs<ExtArgs>
            result: $Utils.Optional<OrganizationGroupByOutputType>[]
          }
          count: {
            args: Prisma.OrganizationCountArgs<ExtArgs>
            result: $Utils.Optional<OrganizationCountAggregateOutputType> | number
          }
        }
      }
      Worker: {
        payload: Prisma.$WorkerPayload<ExtArgs>
        fields: Prisma.WorkerFieldRefs
        operations: {
          findUnique: {
            args: Prisma.WorkerFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkerPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.WorkerFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkerPayload>
          }
          findFirst: {
            args: Prisma.WorkerFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkerPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.WorkerFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkerPayload>
          }
          findMany: {
            args: Prisma.WorkerFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkerPayload>[]
          }
          create: {
            args: Prisma.WorkerCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkerPayload>
          }
          createMany: {
            args: Prisma.WorkerCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.WorkerDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkerPayload>
          }
          update: {
            args: Prisma.WorkerUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkerPayload>
          }
          deleteMany: {
            args: Prisma.WorkerDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.WorkerUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.WorkerUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkerPayload>
          }
          aggregate: {
            args: Prisma.WorkerAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateWorker>
          }
          groupBy: {
            args: Prisma.WorkerGroupByArgs<ExtArgs>
            result: $Utils.Optional<WorkerGroupByOutputType>[]
          }
          count: {
            args: Prisma.WorkerCountArgs<ExtArgs>
            result: $Utils.Optional<WorkerCountAggregateOutputType> | number
          }
        }
      }
      OrganizationMember: {
        payload: Prisma.$OrganizationMemberPayload<ExtArgs>
        fields: Prisma.OrganizationMemberFieldRefs
        operations: {
          findUnique: {
            args: Prisma.OrganizationMemberFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationMemberPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.OrganizationMemberFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationMemberPayload>
          }
          findFirst: {
            args: Prisma.OrganizationMemberFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationMemberPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.OrganizationMemberFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationMemberPayload>
          }
          findMany: {
            args: Prisma.OrganizationMemberFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationMemberPayload>[]
          }
          create: {
            args: Prisma.OrganizationMemberCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationMemberPayload>
          }
          createMany: {
            args: Prisma.OrganizationMemberCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.OrganizationMemberDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationMemberPayload>
          }
          update: {
            args: Prisma.OrganizationMemberUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationMemberPayload>
          }
          deleteMany: {
            args: Prisma.OrganizationMemberDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.OrganizationMemberUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.OrganizationMemberUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationMemberPayload>
          }
          aggregate: {
            args: Prisma.OrganizationMemberAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateOrganizationMember>
          }
          groupBy: {
            args: Prisma.OrganizationMemberGroupByArgs<ExtArgs>
            result: $Utils.Optional<OrganizationMemberGroupByOutputType>[]
          }
          count: {
            args: Prisma.OrganizationMemberCountArgs<ExtArgs>
            result: $Utils.Optional<OrganizationMemberCountAggregateOutputType> | number
          }
        }
      }
      Client: {
        payload: Prisma.$ClientPayload<ExtArgs>
        fields: Prisma.ClientFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ClientFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ClientFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientPayload>
          }
          findFirst: {
            args: Prisma.ClientFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ClientFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientPayload>
          }
          findMany: {
            args: Prisma.ClientFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientPayload>[]
          }
          create: {
            args: Prisma.ClientCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientPayload>
          }
          createMany: {
            args: Prisma.ClientCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.ClientDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientPayload>
          }
          update: {
            args: Prisma.ClientUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientPayload>
          }
          deleteMany: {
            args: Prisma.ClientDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ClientUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ClientUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientPayload>
          }
          aggregate: {
            args: Prisma.ClientAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateClient>
          }
          groupBy: {
            args: Prisma.ClientGroupByArgs<ExtArgs>
            result: $Utils.Optional<ClientGroupByOutputType>[]
          }
          count: {
            args: Prisma.ClientCountArgs<ExtArgs>
            result: $Utils.Optional<ClientCountAggregateOutputType> | number
          }
        }
      }
      Form: {
        payload: Prisma.$FormPayload<ExtArgs>
        fields: Prisma.FormFieldRefs
        operations: {
          findUnique: {
            args: Prisma.FormFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FormPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.FormFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FormPayload>
          }
          findFirst: {
            args: Prisma.FormFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FormPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.FormFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FormPayload>
          }
          findMany: {
            args: Prisma.FormFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FormPayload>[]
          }
          create: {
            args: Prisma.FormCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FormPayload>
          }
          createMany: {
            args: Prisma.FormCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.FormDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FormPayload>
          }
          update: {
            args: Prisma.FormUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FormPayload>
          }
          deleteMany: {
            args: Prisma.FormDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.FormUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.FormUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FormPayload>
          }
          aggregate: {
            args: Prisma.FormAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateForm>
          }
          groupBy: {
            args: Prisma.FormGroupByArgs<ExtArgs>
            result: $Utils.Optional<FormGroupByOutputType>[]
          }
          count: {
            args: Prisma.FormCountArgs<ExtArgs>
            result: $Utils.Optional<FormCountAggregateOutputType> | number
          }
        }
      }
      FormVersion: {
        payload: Prisma.$FormVersionPayload<ExtArgs>
        fields: Prisma.FormVersionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.FormVersionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FormVersionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.FormVersionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FormVersionPayload>
          }
          findFirst: {
            args: Prisma.FormVersionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FormVersionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.FormVersionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FormVersionPayload>
          }
          findMany: {
            args: Prisma.FormVersionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FormVersionPayload>[]
          }
          create: {
            args: Prisma.FormVersionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FormVersionPayload>
          }
          createMany: {
            args: Prisma.FormVersionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.FormVersionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FormVersionPayload>
          }
          update: {
            args: Prisma.FormVersionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FormVersionPayload>
          }
          deleteMany: {
            args: Prisma.FormVersionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.FormVersionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.FormVersionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FormVersionPayload>
          }
          aggregate: {
            args: Prisma.FormVersionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateFormVersion>
          }
          groupBy: {
            args: Prisma.FormVersionGroupByArgs<ExtArgs>
            result: $Utils.Optional<FormVersionGroupByOutputType>[]
          }
          count: {
            args: Prisma.FormVersionCountArgs<ExtArgs>
            result: $Utils.Optional<FormVersionCountAggregateOutputType> | number
          }
        }
      }
      FormAttachment: {
        payload: Prisma.$FormAttachmentPayload<ExtArgs>
        fields: Prisma.FormAttachmentFieldRefs
        operations: {
          findUnique: {
            args: Prisma.FormAttachmentFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FormAttachmentPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.FormAttachmentFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FormAttachmentPayload>
          }
          findFirst: {
            args: Prisma.FormAttachmentFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FormAttachmentPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.FormAttachmentFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FormAttachmentPayload>
          }
          findMany: {
            args: Prisma.FormAttachmentFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FormAttachmentPayload>[]
          }
          create: {
            args: Prisma.FormAttachmentCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FormAttachmentPayload>
          }
          createMany: {
            args: Prisma.FormAttachmentCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.FormAttachmentDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FormAttachmentPayload>
          }
          update: {
            args: Prisma.FormAttachmentUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FormAttachmentPayload>
          }
          deleteMany: {
            args: Prisma.FormAttachmentDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.FormAttachmentUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.FormAttachmentUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FormAttachmentPayload>
          }
          aggregate: {
            args: Prisma.FormAttachmentAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateFormAttachment>
          }
          groupBy: {
            args: Prisma.FormAttachmentGroupByArgs<ExtArgs>
            result: $Utils.Optional<FormAttachmentGroupByOutputType>[]
          }
          count: {
            args: Prisma.FormAttachmentCountArgs<ExtArgs>
            result: $Utils.Optional<FormAttachmentCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory | null
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    user?: UserOmit
    subscription?: SubscriptionOmit
    organization?: OrganizationOmit
    worker?: WorkerOmit
    organizationMember?: OrganizationMemberOmit
    client?: ClientOmit
    form?: FormOmit
    formVersion?: FormVersionOmit
    formAttachment?: FormAttachmentOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    createdClients: number
    createdForms: number
    updatedForms: number
    organizations: number
    createdOrganizations: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    createdClients?: boolean | UserCountOutputTypeCountCreatedClientsArgs
    createdForms?: boolean | UserCountOutputTypeCountCreatedFormsArgs
    updatedForms?: boolean | UserCountOutputTypeCountUpdatedFormsArgs
    organizations?: boolean | UserCountOutputTypeCountOrganizationsArgs
    createdOrganizations?: boolean | UserCountOutputTypeCountCreatedOrganizationsArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountCreatedClientsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ClientWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountCreatedFormsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FormWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountUpdatedFormsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FormWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountOrganizationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OrganizationMemberWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountCreatedOrganizationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OrganizationWhereInput
  }


  /**
   * Count Type OrganizationCountOutputType
   */

  export type OrganizationCountOutputType = {
    clients: number
    forms: number
    members: number
    workers: number
  }

  export type OrganizationCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    clients?: boolean | OrganizationCountOutputTypeCountClientsArgs
    forms?: boolean | OrganizationCountOutputTypeCountFormsArgs
    members?: boolean | OrganizationCountOutputTypeCountMembersArgs
    workers?: boolean | OrganizationCountOutputTypeCountWorkersArgs
  }

  // Custom InputTypes
  /**
   * OrganizationCountOutputType without action
   */
  export type OrganizationCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OrganizationCountOutputType
     */
    select?: OrganizationCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * OrganizationCountOutputType without action
   */
  export type OrganizationCountOutputTypeCountClientsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ClientWhereInput
  }

  /**
   * OrganizationCountOutputType without action
   */
  export type OrganizationCountOutputTypeCountFormsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FormWhereInput
  }

  /**
   * OrganizationCountOutputType without action
   */
  export type OrganizationCountOutputTypeCountMembersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OrganizationMemberWhereInput
  }

  /**
   * OrganizationCountOutputType without action
   */
  export type OrganizationCountOutputTypeCountWorkersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: WorkerWhereInput
  }


  /**
   * Count Type ClientCountOutputType
   */

  export type ClientCountOutputType = {
    forms: number
  }

  export type ClientCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    forms?: boolean | ClientCountOutputTypeCountFormsArgs
  }

  // Custom InputTypes
  /**
   * ClientCountOutputType without action
   */
  export type ClientCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ClientCountOutputType
     */
    select?: ClientCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ClientCountOutputType without action
   */
  export type ClientCountOutputTypeCountFormsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FormWhereInput
  }


  /**
   * Count Type FormCountOutputType
   */

  export type FormCountOutputType = {
    attachments: number
    versions: number
  }

  export type FormCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    attachments?: boolean | FormCountOutputTypeCountAttachmentsArgs
    versions?: boolean | FormCountOutputTypeCountVersionsArgs
  }

  // Custom InputTypes
  /**
   * FormCountOutputType without action
   */
  export type FormCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FormCountOutputType
     */
    select?: FormCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * FormCountOutputType without action
   */
  export type FormCountOutputTypeCountAttachmentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FormAttachmentWhereInput
  }

  /**
   * FormCountOutputType without action
   */
  export type FormCountOutputTypeCountVersionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FormVersionWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _avg: UserAvgAggregateOutputType | null
    _sum: UserSumAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserAvgAggregateOutputType = {
    id: number | null
  }

  export type UserSumAggregateOutputType = {
    id: number | null
  }

  export type UserMinAggregateOutputType = {
    id: number | null
    googleId: string | null
    email: string | null
    password: string | null
    firstName: string | null
    lastName: string | null
    phone: string | null
    address: string | null
    role: $Enums.users_role | null
    createdAt: Date | null
    updatedAt: Date | null
    jmbg: string | null
    passwordResetToken: string | null
    passwordResetTokenExpiry: Date | null
    emailVerificationExpiry: Date | null
    emailVerificationToken: string | null
    isEmailVerified: boolean | null
    idCardNumber: string | null
  }

  export type UserMaxAggregateOutputType = {
    id: number | null
    googleId: string | null
    email: string | null
    password: string | null
    firstName: string | null
    lastName: string | null
    phone: string | null
    address: string | null
    role: $Enums.users_role | null
    createdAt: Date | null
    updatedAt: Date | null
    jmbg: string | null
    passwordResetToken: string | null
    passwordResetTokenExpiry: Date | null
    emailVerificationExpiry: Date | null
    emailVerificationToken: string | null
    isEmailVerified: boolean | null
    idCardNumber: string | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    googleId: number
    email: number
    password: number
    firstName: number
    lastName: number
    phone: number
    address: number
    role: number
    createdAt: number
    updatedAt: number
    jmbg: number
    passwordResetToken: number
    passwordResetTokenExpiry: number
    emailVerificationExpiry: number
    emailVerificationToken: number
    isEmailVerified: number
    idCardNumber: number
    _all: number
  }


  export type UserAvgAggregateInputType = {
    id?: true
  }

  export type UserSumAggregateInputType = {
    id?: true
  }

  export type UserMinAggregateInputType = {
    id?: true
    googleId?: true
    email?: true
    password?: true
    firstName?: true
    lastName?: true
    phone?: true
    address?: true
    role?: true
    createdAt?: true
    updatedAt?: true
    jmbg?: true
    passwordResetToken?: true
    passwordResetTokenExpiry?: true
    emailVerificationExpiry?: true
    emailVerificationToken?: true
    isEmailVerified?: true
    idCardNumber?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    googleId?: true
    email?: true
    password?: true
    firstName?: true
    lastName?: true
    phone?: true
    address?: true
    role?: true
    createdAt?: true
    updatedAt?: true
    jmbg?: true
    passwordResetToken?: true
    passwordResetTokenExpiry?: true
    emailVerificationExpiry?: true
    emailVerificationToken?: true
    isEmailVerified?: true
    idCardNumber?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    googleId?: true
    email?: true
    password?: true
    firstName?: true
    lastName?: true
    phone?: true
    address?: true
    role?: true
    createdAt?: true
    updatedAt?: true
    jmbg?: true
    passwordResetToken?: true
    passwordResetTokenExpiry?: true
    emailVerificationExpiry?: true
    emailVerificationToken?: true
    isEmailVerified?: true
    idCardNumber?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: UserAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: UserSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _avg?: UserAvgAggregateInputType
    _sum?: UserSumAggregateInputType
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: number
    googleId: string | null
    email: string | null
    password: string | null
    firstName: string
    lastName: string
    phone: string | null
    address: string | null
    role: $Enums.users_role
    createdAt: Date
    updatedAt: Date
    jmbg: string | null
    passwordResetToken: string | null
    passwordResetTokenExpiry: Date | null
    emailVerificationExpiry: Date | null
    emailVerificationToken: string | null
    isEmailVerified: boolean
    idCardNumber: string | null
    _count: UserCountAggregateOutputType | null
    _avg: UserAvgAggregateOutputType | null
    _sum: UserSumAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    googleId?: boolean
    email?: boolean
    password?: boolean
    firstName?: boolean
    lastName?: boolean
    phone?: boolean
    address?: boolean
    role?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    jmbg?: boolean
    passwordResetToken?: boolean
    passwordResetTokenExpiry?: boolean
    emailVerificationExpiry?: boolean
    emailVerificationToken?: boolean
    isEmailVerified?: boolean
    idCardNumber?: boolean
    createdClients?: boolean | User$createdClientsArgs<ExtArgs>
    createdForms?: boolean | User$createdFormsArgs<ExtArgs>
    updatedForms?: boolean | User$updatedFormsArgs<ExtArgs>
    organizations?: boolean | User$organizationsArgs<ExtArgs>
    createdOrganizations?: boolean | User$createdOrganizationsArgs<ExtArgs>
    subscription?: boolean | User$subscriptionArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>



  export type UserSelectScalar = {
    id?: boolean
    googleId?: boolean
    email?: boolean
    password?: boolean
    firstName?: boolean
    lastName?: boolean
    phone?: boolean
    address?: boolean
    role?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    jmbg?: boolean
    passwordResetToken?: boolean
    passwordResetTokenExpiry?: boolean
    emailVerificationExpiry?: boolean
    emailVerificationToken?: boolean
    isEmailVerified?: boolean
    idCardNumber?: boolean
  }

  export type UserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "googleId" | "email" | "password" | "firstName" | "lastName" | "phone" | "address" | "role" | "createdAt" | "updatedAt" | "jmbg" | "passwordResetToken" | "passwordResetTokenExpiry" | "emailVerificationExpiry" | "emailVerificationToken" | "isEmailVerified" | "idCardNumber", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    createdClients?: boolean | User$createdClientsArgs<ExtArgs>
    createdForms?: boolean | User$createdFormsArgs<ExtArgs>
    updatedForms?: boolean | User$updatedFormsArgs<ExtArgs>
    organizations?: boolean | User$organizationsArgs<ExtArgs>
    createdOrganizations?: boolean | User$createdOrganizationsArgs<ExtArgs>
    subscription?: boolean | User$subscriptionArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      createdClients: Prisma.$ClientPayload<ExtArgs>[]
      createdForms: Prisma.$FormPayload<ExtArgs>[]
      updatedForms: Prisma.$FormPayload<ExtArgs>[]
      organizations: Prisma.$OrganizationMemberPayload<ExtArgs>[]
      createdOrganizations: Prisma.$OrganizationPayload<ExtArgs>[]
      subscription: Prisma.$SubscriptionPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      googleId: string | null
      email: string | null
      password: string | null
      firstName: string
      lastName: string
      phone: string | null
      address: string | null
      role: $Enums.users_role
      createdAt: Date
      updatedAt: Date
      jmbg: string | null
      passwordResetToken: string | null
      passwordResetTokenExpiry: Date | null
      emailVerificationExpiry: Date | null
      emailVerificationToken: string | null
      isEmailVerified: boolean
      idCardNumber: string | null
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    createdClients<T extends User$createdClientsArgs<ExtArgs> = {}>(args?: Subset<T, User$createdClientsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ClientPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    createdForms<T extends User$createdFormsArgs<ExtArgs> = {}>(args?: Subset<T, User$createdFormsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FormPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    updatedForms<T extends User$updatedFormsArgs<ExtArgs> = {}>(args?: Subset<T, User$updatedFormsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FormPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    organizations<T extends User$organizationsArgs<ExtArgs> = {}>(args?: Subset<T, User$organizationsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OrganizationMemberPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    createdOrganizations<T extends User$createdOrganizationsArgs<ExtArgs> = {}>(args?: Subset<T, User$createdOrganizationsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    subscription<T extends User$subscriptionArgs<ExtArgs> = {}>(args?: Subset<T, User$subscriptionArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'Int'>
    readonly googleId: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly password: FieldRef<"User", 'String'>
    readonly firstName: FieldRef<"User", 'String'>
    readonly lastName: FieldRef<"User", 'String'>
    readonly phone: FieldRef<"User", 'String'>
    readonly address: FieldRef<"User", 'String'>
    readonly role: FieldRef<"User", 'users_role'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
    readonly jmbg: FieldRef<"User", 'String'>
    readonly passwordResetToken: FieldRef<"User", 'String'>
    readonly passwordResetTokenExpiry: FieldRef<"User", 'DateTime'>
    readonly emailVerificationExpiry: FieldRef<"User", 'DateTime'>
    readonly emailVerificationToken: FieldRef<"User", 'String'>
    readonly isEmailVerified: FieldRef<"User", 'Boolean'>
    readonly idCardNumber: FieldRef<"User", 'String'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User.createdClients
   */
  export type User$createdClientsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Client
     */
    select?: ClientSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Client
     */
    omit?: ClientOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClientInclude<ExtArgs> | null
    where?: ClientWhereInput
    orderBy?: ClientOrderByWithRelationInput | ClientOrderByWithRelationInput[]
    cursor?: ClientWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ClientScalarFieldEnum | ClientScalarFieldEnum[]
  }

  /**
   * User.createdForms
   */
  export type User$createdFormsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Form
     */
    select?: FormSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Form
     */
    omit?: FormOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormInclude<ExtArgs> | null
    where?: FormWhereInput
    orderBy?: FormOrderByWithRelationInput | FormOrderByWithRelationInput[]
    cursor?: FormWhereUniqueInput
    take?: number
    skip?: number
    distinct?: FormScalarFieldEnum | FormScalarFieldEnum[]
  }

  /**
   * User.updatedForms
   */
  export type User$updatedFormsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Form
     */
    select?: FormSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Form
     */
    omit?: FormOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormInclude<ExtArgs> | null
    where?: FormWhereInput
    orderBy?: FormOrderByWithRelationInput | FormOrderByWithRelationInput[]
    cursor?: FormWhereUniqueInput
    take?: number
    skip?: number
    distinct?: FormScalarFieldEnum | FormScalarFieldEnum[]
  }

  /**
   * User.organizations
   */
  export type User$organizationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OrganizationMember
     */
    select?: OrganizationMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OrganizationMember
     */
    omit?: OrganizationMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationMemberInclude<ExtArgs> | null
    where?: OrganizationMemberWhereInput
    orderBy?: OrganizationMemberOrderByWithRelationInput | OrganizationMemberOrderByWithRelationInput[]
    cursor?: OrganizationMemberWhereUniqueInput
    take?: number
    skip?: number
    distinct?: OrganizationMemberScalarFieldEnum | OrganizationMemberScalarFieldEnum[]
  }

  /**
   * User.createdOrganizations
   */
  export type User$createdOrganizationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Organization
     */
    omit?: OrganizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationInclude<ExtArgs> | null
    where?: OrganizationWhereInput
    orderBy?: OrganizationOrderByWithRelationInput | OrganizationOrderByWithRelationInput[]
    cursor?: OrganizationWhereUniqueInput
    take?: number
    skip?: number
    distinct?: OrganizationScalarFieldEnum | OrganizationScalarFieldEnum[]
  }

  /**
   * User.subscription
   */
  export type User$subscriptionArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    where?: SubscriptionWhereInput
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model Subscription
   */

  export type AggregateSubscription = {
    _count: SubscriptionCountAggregateOutputType | null
    _avg: SubscriptionAvgAggregateOutputType | null
    _sum: SubscriptionSumAggregateOutputType | null
    _min: SubscriptionMinAggregateOutputType | null
    _max: SubscriptionMaxAggregateOutputType | null
  }

  export type SubscriptionAvgAggregateOutputType = {
    id: number | null
    userId: number | null
  }

  export type SubscriptionSumAggregateOutputType = {
    id: number | null
    userId: number | null
  }

  export type SubscriptionMinAggregateOutputType = {
    id: number | null
    userId: number | null
    startDate: Date | null
    endDate: Date | null
    isActive: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SubscriptionMaxAggregateOutputType = {
    id: number | null
    userId: number | null
    startDate: Date | null
    endDate: Date | null
    isActive: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SubscriptionCountAggregateOutputType = {
    id: number
    userId: number
    startDate: number
    endDate: number
    isActive: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type SubscriptionAvgAggregateInputType = {
    id?: true
    userId?: true
  }

  export type SubscriptionSumAggregateInputType = {
    id?: true
    userId?: true
  }

  export type SubscriptionMinAggregateInputType = {
    id?: true
    userId?: true
    startDate?: true
    endDate?: true
    isActive?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SubscriptionMaxAggregateInputType = {
    id?: true
    userId?: true
    startDate?: true
    endDate?: true
    isActive?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SubscriptionCountAggregateInputType = {
    id?: true
    userId?: true
    startDate?: true
    endDate?: true
    isActive?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type SubscriptionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Subscription to aggregate.
     */
    where?: SubscriptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Subscriptions to fetch.
     */
    orderBy?: SubscriptionOrderByWithRelationInput | SubscriptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SubscriptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Subscriptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Subscriptions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Subscriptions
    **/
    _count?: true | SubscriptionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: SubscriptionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: SubscriptionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SubscriptionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SubscriptionMaxAggregateInputType
  }

  export type GetSubscriptionAggregateType<T extends SubscriptionAggregateArgs> = {
        [P in keyof T & keyof AggregateSubscription]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSubscription[P]>
      : GetScalarType<T[P], AggregateSubscription[P]>
  }




  export type SubscriptionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SubscriptionWhereInput
    orderBy?: SubscriptionOrderByWithAggregationInput | SubscriptionOrderByWithAggregationInput[]
    by: SubscriptionScalarFieldEnum[] | SubscriptionScalarFieldEnum
    having?: SubscriptionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SubscriptionCountAggregateInputType | true
    _avg?: SubscriptionAvgAggregateInputType
    _sum?: SubscriptionSumAggregateInputType
    _min?: SubscriptionMinAggregateInputType
    _max?: SubscriptionMaxAggregateInputType
  }

  export type SubscriptionGroupByOutputType = {
    id: number
    userId: number
    startDate: Date
    endDate: Date
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    _count: SubscriptionCountAggregateOutputType | null
    _avg: SubscriptionAvgAggregateOutputType | null
    _sum: SubscriptionSumAggregateOutputType | null
    _min: SubscriptionMinAggregateOutputType | null
    _max: SubscriptionMaxAggregateOutputType | null
  }

  type GetSubscriptionGroupByPayload<T extends SubscriptionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SubscriptionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SubscriptionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SubscriptionGroupByOutputType[P]>
            : GetScalarType<T[P], SubscriptionGroupByOutputType[P]>
        }
      >
    >


  export type SubscriptionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    startDate?: boolean
    endDate?: boolean
    isActive?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["subscription"]>



  export type SubscriptionSelectScalar = {
    id?: boolean
    userId?: boolean
    startDate?: boolean
    endDate?: boolean
    isActive?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type SubscriptionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "startDate" | "endDate" | "isActive" | "createdAt" | "updatedAt", ExtArgs["result"]["subscription"]>
  export type SubscriptionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $SubscriptionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Subscription"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      userId: number
      startDate: Date
      endDate: Date
      isActive: boolean
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["subscription"]>
    composites: {}
  }

  type SubscriptionGetPayload<S extends boolean | null | undefined | SubscriptionDefaultArgs> = $Result.GetResult<Prisma.$SubscriptionPayload, S>

  type SubscriptionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SubscriptionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SubscriptionCountAggregateInputType | true
    }

  export interface SubscriptionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Subscription'], meta: { name: 'Subscription' } }
    /**
     * Find zero or one Subscription that matches the filter.
     * @param {SubscriptionFindUniqueArgs} args - Arguments to find a Subscription
     * @example
     * // Get one Subscription
     * const subscription = await prisma.subscription.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SubscriptionFindUniqueArgs>(args: SelectSubset<T, SubscriptionFindUniqueArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Subscription that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SubscriptionFindUniqueOrThrowArgs} args - Arguments to find a Subscription
     * @example
     * // Get one Subscription
     * const subscription = await prisma.subscription.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SubscriptionFindUniqueOrThrowArgs>(args: SelectSubset<T, SubscriptionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Subscription that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionFindFirstArgs} args - Arguments to find a Subscription
     * @example
     * // Get one Subscription
     * const subscription = await prisma.subscription.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SubscriptionFindFirstArgs>(args?: SelectSubset<T, SubscriptionFindFirstArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Subscription that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionFindFirstOrThrowArgs} args - Arguments to find a Subscription
     * @example
     * // Get one Subscription
     * const subscription = await prisma.subscription.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SubscriptionFindFirstOrThrowArgs>(args?: SelectSubset<T, SubscriptionFindFirstOrThrowArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Subscriptions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Subscriptions
     * const subscriptions = await prisma.subscription.findMany()
     * 
     * // Get first 10 Subscriptions
     * const subscriptions = await prisma.subscription.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const subscriptionWithIdOnly = await prisma.subscription.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SubscriptionFindManyArgs>(args?: SelectSubset<T, SubscriptionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Subscription.
     * @param {SubscriptionCreateArgs} args - Arguments to create a Subscription.
     * @example
     * // Create one Subscription
     * const Subscription = await prisma.subscription.create({
     *   data: {
     *     // ... data to create a Subscription
     *   }
     * })
     * 
     */
    create<T extends SubscriptionCreateArgs>(args: SelectSubset<T, SubscriptionCreateArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Subscriptions.
     * @param {SubscriptionCreateManyArgs} args - Arguments to create many Subscriptions.
     * @example
     * // Create many Subscriptions
     * const subscription = await prisma.subscription.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SubscriptionCreateManyArgs>(args?: SelectSubset<T, SubscriptionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Subscription.
     * @param {SubscriptionDeleteArgs} args - Arguments to delete one Subscription.
     * @example
     * // Delete one Subscription
     * const Subscription = await prisma.subscription.delete({
     *   where: {
     *     // ... filter to delete one Subscription
     *   }
     * })
     * 
     */
    delete<T extends SubscriptionDeleteArgs>(args: SelectSubset<T, SubscriptionDeleteArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Subscription.
     * @param {SubscriptionUpdateArgs} args - Arguments to update one Subscription.
     * @example
     * // Update one Subscription
     * const subscription = await prisma.subscription.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SubscriptionUpdateArgs>(args: SelectSubset<T, SubscriptionUpdateArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Subscriptions.
     * @param {SubscriptionDeleteManyArgs} args - Arguments to filter Subscriptions to delete.
     * @example
     * // Delete a few Subscriptions
     * const { count } = await prisma.subscription.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SubscriptionDeleteManyArgs>(args?: SelectSubset<T, SubscriptionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Subscriptions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Subscriptions
     * const subscription = await prisma.subscription.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SubscriptionUpdateManyArgs>(args: SelectSubset<T, SubscriptionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Subscription.
     * @param {SubscriptionUpsertArgs} args - Arguments to update or create a Subscription.
     * @example
     * // Update or create a Subscription
     * const subscription = await prisma.subscription.upsert({
     *   create: {
     *     // ... data to create a Subscription
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Subscription we want to update
     *   }
     * })
     */
    upsert<T extends SubscriptionUpsertArgs>(args: SelectSubset<T, SubscriptionUpsertArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Subscriptions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionCountArgs} args - Arguments to filter Subscriptions to count.
     * @example
     * // Count the number of Subscriptions
     * const count = await prisma.subscription.count({
     *   where: {
     *     // ... the filter for the Subscriptions we want to count
     *   }
     * })
    **/
    count<T extends SubscriptionCountArgs>(
      args?: Subset<T, SubscriptionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SubscriptionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Subscription.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SubscriptionAggregateArgs>(args: Subset<T, SubscriptionAggregateArgs>): Prisma.PrismaPromise<GetSubscriptionAggregateType<T>>

    /**
     * Group by Subscription.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SubscriptionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SubscriptionGroupByArgs['orderBy'] }
        : { orderBy?: SubscriptionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SubscriptionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSubscriptionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Subscription model
   */
  readonly fields: SubscriptionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Subscription.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SubscriptionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Subscription model
   */
  interface SubscriptionFieldRefs {
    readonly id: FieldRef<"Subscription", 'Int'>
    readonly userId: FieldRef<"Subscription", 'Int'>
    readonly startDate: FieldRef<"Subscription", 'DateTime'>
    readonly endDate: FieldRef<"Subscription", 'DateTime'>
    readonly isActive: FieldRef<"Subscription", 'Boolean'>
    readonly createdAt: FieldRef<"Subscription", 'DateTime'>
    readonly updatedAt: FieldRef<"Subscription", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Subscription findUnique
   */
  export type SubscriptionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which Subscription to fetch.
     */
    where: SubscriptionWhereUniqueInput
  }

  /**
   * Subscription findUniqueOrThrow
   */
  export type SubscriptionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which Subscription to fetch.
     */
    where: SubscriptionWhereUniqueInput
  }

  /**
   * Subscription findFirst
   */
  export type SubscriptionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which Subscription to fetch.
     */
    where?: SubscriptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Subscriptions to fetch.
     */
    orderBy?: SubscriptionOrderByWithRelationInput | SubscriptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Subscriptions.
     */
    cursor?: SubscriptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Subscriptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Subscriptions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Subscriptions.
     */
    distinct?: SubscriptionScalarFieldEnum | SubscriptionScalarFieldEnum[]
  }

  /**
   * Subscription findFirstOrThrow
   */
  export type SubscriptionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which Subscription to fetch.
     */
    where?: SubscriptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Subscriptions to fetch.
     */
    orderBy?: SubscriptionOrderByWithRelationInput | SubscriptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Subscriptions.
     */
    cursor?: SubscriptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Subscriptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Subscriptions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Subscriptions.
     */
    distinct?: SubscriptionScalarFieldEnum | SubscriptionScalarFieldEnum[]
  }

  /**
   * Subscription findMany
   */
  export type SubscriptionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which Subscriptions to fetch.
     */
    where?: SubscriptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Subscriptions to fetch.
     */
    orderBy?: SubscriptionOrderByWithRelationInput | SubscriptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Subscriptions.
     */
    cursor?: SubscriptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Subscriptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Subscriptions.
     */
    skip?: number
    distinct?: SubscriptionScalarFieldEnum | SubscriptionScalarFieldEnum[]
  }

  /**
   * Subscription create
   */
  export type SubscriptionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * The data needed to create a Subscription.
     */
    data: XOR<SubscriptionCreateInput, SubscriptionUncheckedCreateInput>
  }

  /**
   * Subscription createMany
   */
  export type SubscriptionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Subscriptions.
     */
    data: SubscriptionCreateManyInput | SubscriptionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Subscription update
   */
  export type SubscriptionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * The data needed to update a Subscription.
     */
    data: XOR<SubscriptionUpdateInput, SubscriptionUncheckedUpdateInput>
    /**
     * Choose, which Subscription to update.
     */
    where: SubscriptionWhereUniqueInput
  }

  /**
   * Subscription updateMany
   */
  export type SubscriptionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Subscriptions.
     */
    data: XOR<SubscriptionUpdateManyMutationInput, SubscriptionUncheckedUpdateManyInput>
    /**
     * Filter which Subscriptions to update
     */
    where?: SubscriptionWhereInput
    /**
     * Limit how many Subscriptions to update.
     */
    limit?: number
  }

  /**
   * Subscription upsert
   */
  export type SubscriptionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * The filter to search for the Subscription to update in case it exists.
     */
    where: SubscriptionWhereUniqueInput
    /**
     * In case the Subscription found by the `where` argument doesn't exist, create a new Subscription with this data.
     */
    create: XOR<SubscriptionCreateInput, SubscriptionUncheckedCreateInput>
    /**
     * In case the Subscription was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SubscriptionUpdateInput, SubscriptionUncheckedUpdateInput>
  }

  /**
   * Subscription delete
   */
  export type SubscriptionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * Filter which Subscription to delete.
     */
    where: SubscriptionWhereUniqueInput
  }

  /**
   * Subscription deleteMany
   */
  export type SubscriptionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Subscriptions to delete
     */
    where?: SubscriptionWhereInput
    /**
     * Limit how many Subscriptions to delete.
     */
    limit?: number
  }

  /**
   * Subscription without action
   */
  export type SubscriptionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
  }


  /**
   * Model Organization
   */

  export type AggregateOrganization = {
    _count: OrganizationCountAggregateOutputType | null
    _avg: OrganizationAvgAggregateOutputType | null
    _sum: OrganizationSumAggregateOutputType | null
    _min: OrganizationMinAggregateOutputType | null
    _max: OrganizationMaxAggregateOutputType | null
  }

  export type OrganizationAvgAggregateOutputType = {
    id: number | null
    createdById: number | null
  }

  export type OrganizationSumAggregateOutputType = {
    id: number | null
    createdById: number | null
  }

  export type OrganizationMinAggregateOutputType = {
    id: number | null
    name: string | null
    taxNumber: string | null
    email: string | null
    phone: string | null
    address: string | null
    createdAt: Date | null
    updatedAt: Date | null
    createdById: number | null
    type: $Enums.OrganizationType | null
    activityCode: string | null
    activityName: string | null
    isClientOrg: boolean | null
  }

  export type OrganizationMaxAggregateOutputType = {
    id: number | null
    name: string | null
    taxNumber: string | null
    email: string | null
    phone: string | null
    address: string | null
    createdAt: Date | null
    updatedAt: Date | null
    createdById: number | null
    type: $Enums.OrganizationType | null
    activityCode: string | null
    activityName: string | null
    isClientOrg: boolean | null
  }

  export type OrganizationCountAggregateOutputType = {
    id: number
    name: number
    taxNumber: number
    email: number
    phone: number
    address: number
    createdAt: number
    updatedAt: number
    createdById: number
    type: number
    activityCode: number
    activityName: number
    isClientOrg: number
    _all: number
  }


  export type OrganizationAvgAggregateInputType = {
    id?: true
    createdById?: true
  }

  export type OrganizationSumAggregateInputType = {
    id?: true
    createdById?: true
  }

  export type OrganizationMinAggregateInputType = {
    id?: true
    name?: true
    taxNumber?: true
    email?: true
    phone?: true
    address?: true
    createdAt?: true
    updatedAt?: true
    createdById?: true
    type?: true
    activityCode?: true
    activityName?: true
    isClientOrg?: true
  }

  export type OrganizationMaxAggregateInputType = {
    id?: true
    name?: true
    taxNumber?: true
    email?: true
    phone?: true
    address?: true
    createdAt?: true
    updatedAt?: true
    createdById?: true
    type?: true
    activityCode?: true
    activityName?: true
    isClientOrg?: true
  }

  export type OrganizationCountAggregateInputType = {
    id?: true
    name?: true
    taxNumber?: true
    email?: true
    phone?: true
    address?: true
    createdAt?: true
    updatedAt?: true
    createdById?: true
    type?: true
    activityCode?: true
    activityName?: true
    isClientOrg?: true
    _all?: true
  }

  export type OrganizationAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Organization to aggregate.
     */
    where?: OrganizationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Organizations to fetch.
     */
    orderBy?: OrganizationOrderByWithRelationInput | OrganizationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: OrganizationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Organizations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Organizations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Organizations
    **/
    _count?: true | OrganizationCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: OrganizationAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: OrganizationSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: OrganizationMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: OrganizationMaxAggregateInputType
  }

  export type GetOrganizationAggregateType<T extends OrganizationAggregateArgs> = {
        [P in keyof T & keyof AggregateOrganization]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateOrganization[P]>
      : GetScalarType<T[P], AggregateOrganization[P]>
  }




  export type OrganizationGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OrganizationWhereInput
    orderBy?: OrganizationOrderByWithAggregationInput | OrganizationOrderByWithAggregationInput[]
    by: OrganizationScalarFieldEnum[] | OrganizationScalarFieldEnum
    having?: OrganizationScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: OrganizationCountAggregateInputType | true
    _avg?: OrganizationAvgAggregateInputType
    _sum?: OrganizationSumAggregateInputType
    _min?: OrganizationMinAggregateInputType
    _max?: OrganizationMaxAggregateInputType
  }

  export type OrganizationGroupByOutputType = {
    id: number
    name: string
    taxNumber: string | null
    email: string | null
    phone: string | null
    address: string | null
    createdAt: Date
    updatedAt: Date
    createdById: number
    type: $Enums.OrganizationType
    activityCode: string | null
    activityName: string | null
    isClientOrg: boolean
    _count: OrganizationCountAggregateOutputType | null
    _avg: OrganizationAvgAggregateOutputType | null
    _sum: OrganizationSumAggregateOutputType | null
    _min: OrganizationMinAggregateOutputType | null
    _max: OrganizationMaxAggregateOutputType | null
  }

  type GetOrganizationGroupByPayload<T extends OrganizationGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<OrganizationGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof OrganizationGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], OrganizationGroupByOutputType[P]>
            : GetScalarType<T[P], OrganizationGroupByOutputType[P]>
        }
      >
    >


  export type OrganizationSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    taxNumber?: boolean
    email?: boolean
    phone?: boolean
    address?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    createdById?: boolean
    type?: boolean
    activityCode?: boolean
    activityName?: boolean
    isClientOrg?: boolean
    clients?: boolean | Organization$clientsArgs<ExtArgs>
    forms?: boolean | Organization$formsArgs<ExtArgs>
    members?: boolean | Organization$membersArgs<ExtArgs>
    createdBy?: boolean | UserDefaultArgs<ExtArgs>
    workers?: boolean | Organization$workersArgs<ExtArgs>
    _count?: boolean | OrganizationCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["organization"]>



  export type OrganizationSelectScalar = {
    id?: boolean
    name?: boolean
    taxNumber?: boolean
    email?: boolean
    phone?: boolean
    address?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    createdById?: boolean
    type?: boolean
    activityCode?: boolean
    activityName?: boolean
    isClientOrg?: boolean
  }

  export type OrganizationOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "taxNumber" | "email" | "phone" | "address" | "createdAt" | "updatedAt" | "createdById" | "type" | "activityCode" | "activityName" | "isClientOrg", ExtArgs["result"]["organization"]>
  export type OrganizationInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    clients?: boolean | Organization$clientsArgs<ExtArgs>
    forms?: boolean | Organization$formsArgs<ExtArgs>
    members?: boolean | Organization$membersArgs<ExtArgs>
    createdBy?: boolean | UserDefaultArgs<ExtArgs>
    workers?: boolean | Organization$workersArgs<ExtArgs>
    _count?: boolean | OrganizationCountOutputTypeDefaultArgs<ExtArgs>
  }

  export type $OrganizationPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Organization"
    objects: {
      clients: Prisma.$ClientPayload<ExtArgs>[]
      forms: Prisma.$FormPayload<ExtArgs>[]
      members: Prisma.$OrganizationMemberPayload<ExtArgs>[]
      createdBy: Prisma.$UserPayload<ExtArgs>
      workers: Prisma.$WorkerPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      name: string
      taxNumber: string | null
      email: string | null
      phone: string | null
      address: string | null
      createdAt: Date
      updatedAt: Date
      createdById: number
      type: $Enums.OrganizationType
      activityCode: string | null
      activityName: string | null
      isClientOrg: boolean
    }, ExtArgs["result"]["organization"]>
    composites: {}
  }

  type OrganizationGetPayload<S extends boolean | null | undefined | OrganizationDefaultArgs> = $Result.GetResult<Prisma.$OrganizationPayload, S>

  type OrganizationCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<OrganizationFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: OrganizationCountAggregateInputType | true
    }

  export interface OrganizationDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Organization'], meta: { name: 'Organization' } }
    /**
     * Find zero or one Organization that matches the filter.
     * @param {OrganizationFindUniqueArgs} args - Arguments to find a Organization
     * @example
     * // Get one Organization
     * const organization = await prisma.organization.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends OrganizationFindUniqueArgs>(args: SelectSubset<T, OrganizationFindUniqueArgs<ExtArgs>>): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Organization that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {OrganizationFindUniqueOrThrowArgs} args - Arguments to find a Organization
     * @example
     * // Get one Organization
     * const organization = await prisma.organization.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends OrganizationFindUniqueOrThrowArgs>(args: SelectSubset<T, OrganizationFindUniqueOrThrowArgs<ExtArgs>>): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Organization that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationFindFirstArgs} args - Arguments to find a Organization
     * @example
     * // Get one Organization
     * const organization = await prisma.organization.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends OrganizationFindFirstArgs>(args?: SelectSubset<T, OrganizationFindFirstArgs<ExtArgs>>): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Organization that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationFindFirstOrThrowArgs} args - Arguments to find a Organization
     * @example
     * // Get one Organization
     * const organization = await prisma.organization.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends OrganizationFindFirstOrThrowArgs>(args?: SelectSubset<T, OrganizationFindFirstOrThrowArgs<ExtArgs>>): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Organizations that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Organizations
     * const organizations = await prisma.organization.findMany()
     * 
     * // Get first 10 Organizations
     * const organizations = await prisma.organization.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const organizationWithIdOnly = await prisma.organization.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends OrganizationFindManyArgs>(args?: SelectSubset<T, OrganizationFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Organization.
     * @param {OrganizationCreateArgs} args - Arguments to create a Organization.
     * @example
     * // Create one Organization
     * const Organization = await prisma.organization.create({
     *   data: {
     *     // ... data to create a Organization
     *   }
     * })
     * 
     */
    create<T extends OrganizationCreateArgs>(args: SelectSubset<T, OrganizationCreateArgs<ExtArgs>>): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Organizations.
     * @param {OrganizationCreateManyArgs} args - Arguments to create many Organizations.
     * @example
     * // Create many Organizations
     * const organization = await prisma.organization.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends OrganizationCreateManyArgs>(args?: SelectSubset<T, OrganizationCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Organization.
     * @param {OrganizationDeleteArgs} args - Arguments to delete one Organization.
     * @example
     * // Delete one Organization
     * const Organization = await prisma.organization.delete({
     *   where: {
     *     // ... filter to delete one Organization
     *   }
     * })
     * 
     */
    delete<T extends OrganizationDeleteArgs>(args: SelectSubset<T, OrganizationDeleteArgs<ExtArgs>>): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Organization.
     * @param {OrganizationUpdateArgs} args - Arguments to update one Organization.
     * @example
     * // Update one Organization
     * const organization = await prisma.organization.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends OrganizationUpdateArgs>(args: SelectSubset<T, OrganizationUpdateArgs<ExtArgs>>): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Organizations.
     * @param {OrganizationDeleteManyArgs} args - Arguments to filter Organizations to delete.
     * @example
     * // Delete a few Organizations
     * const { count } = await prisma.organization.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends OrganizationDeleteManyArgs>(args?: SelectSubset<T, OrganizationDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Organizations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Organizations
     * const organization = await prisma.organization.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends OrganizationUpdateManyArgs>(args: SelectSubset<T, OrganizationUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Organization.
     * @param {OrganizationUpsertArgs} args - Arguments to update or create a Organization.
     * @example
     * // Update or create a Organization
     * const organization = await prisma.organization.upsert({
     *   create: {
     *     // ... data to create a Organization
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Organization we want to update
     *   }
     * })
     */
    upsert<T extends OrganizationUpsertArgs>(args: SelectSubset<T, OrganizationUpsertArgs<ExtArgs>>): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Organizations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationCountArgs} args - Arguments to filter Organizations to count.
     * @example
     * // Count the number of Organizations
     * const count = await prisma.organization.count({
     *   where: {
     *     // ... the filter for the Organizations we want to count
     *   }
     * })
    **/
    count<T extends OrganizationCountArgs>(
      args?: Subset<T, OrganizationCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], OrganizationCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Organization.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends OrganizationAggregateArgs>(args: Subset<T, OrganizationAggregateArgs>): Prisma.PrismaPromise<GetOrganizationAggregateType<T>>

    /**
     * Group by Organization.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends OrganizationGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: OrganizationGroupByArgs['orderBy'] }
        : { orderBy?: OrganizationGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, OrganizationGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetOrganizationGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Organization model
   */
  readonly fields: OrganizationFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Organization.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__OrganizationClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    clients<T extends Organization$clientsArgs<ExtArgs> = {}>(args?: Subset<T, Organization$clientsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ClientPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    forms<T extends Organization$formsArgs<ExtArgs> = {}>(args?: Subset<T, Organization$formsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FormPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    members<T extends Organization$membersArgs<ExtArgs> = {}>(args?: Subset<T, Organization$membersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OrganizationMemberPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    createdBy<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    workers<T extends Organization$workersArgs<ExtArgs> = {}>(args?: Subset<T, Organization$workersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WorkerPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Organization model
   */
  interface OrganizationFieldRefs {
    readonly id: FieldRef<"Organization", 'Int'>
    readonly name: FieldRef<"Organization", 'String'>
    readonly taxNumber: FieldRef<"Organization", 'String'>
    readonly email: FieldRef<"Organization", 'String'>
    readonly phone: FieldRef<"Organization", 'String'>
    readonly address: FieldRef<"Organization", 'String'>
    readonly createdAt: FieldRef<"Organization", 'DateTime'>
    readonly updatedAt: FieldRef<"Organization", 'DateTime'>
    readonly createdById: FieldRef<"Organization", 'Int'>
    readonly type: FieldRef<"Organization", 'OrganizationType'>
    readonly activityCode: FieldRef<"Organization", 'String'>
    readonly activityName: FieldRef<"Organization", 'String'>
    readonly isClientOrg: FieldRef<"Organization", 'Boolean'>
  }
    

  // Custom InputTypes
  /**
   * Organization findUnique
   */
  export type OrganizationFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Organization
     */
    omit?: OrganizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * Filter, which Organization to fetch.
     */
    where: OrganizationWhereUniqueInput
  }

  /**
   * Organization findUniqueOrThrow
   */
  export type OrganizationFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Organization
     */
    omit?: OrganizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * Filter, which Organization to fetch.
     */
    where: OrganizationWhereUniqueInput
  }

  /**
   * Organization findFirst
   */
  export type OrganizationFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Organization
     */
    omit?: OrganizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * Filter, which Organization to fetch.
     */
    where?: OrganizationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Organizations to fetch.
     */
    orderBy?: OrganizationOrderByWithRelationInput | OrganizationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Organizations.
     */
    cursor?: OrganizationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Organizations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Organizations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Organizations.
     */
    distinct?: OrganizationScalarFieldEnum | OrganizationScalarFieldEnum[]
  }

  /**
   * Organization findFirstOrThrow
   */
  export type OrganizationFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Organization
     */
    omit?: OrganizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * Filter, which Organization to fetch.
     */
    where?: OrganizationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Organizations to fetch.
     */
    orderBy?: OrganizationOrderByWithRelationInput | OrganizationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Organizations.
     */
    cursor?: OrganizationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Organizations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Organizations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Organizations.
     */
    distinct?: OrganizationScalarFieldEnum | OrganizationScalarFieldEnum[]
  }

  /**
   * Organization findMany
   */
  export type OrganizationFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Organization
     */
    omit?: OrganizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * Filter, which Organizations to fetch.
     */
    where?: OrganizationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Organizations to fetch.
     */
    orderBy?: OrganizationOrderByWithRelationInput | OrganizationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Organizations.
     */
    cursor?: OrganizationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Organizations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Organizations.
     */
    skip?: number
    distinct?: OrganizationScalarFieldEnum | OrganizationScalarFieldEnum[]
  }

  /**
   * Organization create
   */
  export type OrganizationCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Organization
     */
    omit?: OrganizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * The data needed to create a Organization.
     */
    data: XOR<OrganizationCreateInput, OrganizationUncheckedCreateInput>
  }

  /**
   * Organization createMany
   */
  export type OrganizationCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Organizations.
     */
    data: OrganizationCreateManyInput | OrganizationCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Organization update
   */
  export type OrganizationUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Organization
     */
    omit?: OrganizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * The data needed to update a Organization.
     */
    data: XOR<OrganizationUpdateInput, OrganizationUncheckedUpdateInput>
    /**
     * Choose, which Organization to update.
     */
    where: OrganizationWhereUniqueInput
  }

  /**
   * Organization updateMany
   */
  export type OrganizationUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Organizations.
     */
    data: XOR<OrganizationUpdateManyMutationInput, OrganizationUncheckedUpdateManyInput>
    /**
     * Filter which Organizations to update
     */
    where?: OrganizationWhereInput
    /**
     * Limit how many Organizations to update.
     */
    limit?: number
  }

  /**
   * Organization upsert
   */
  export type OrganizationUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Organization
     */
    omit?: OrganizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * The filter to search for the Organization to update in case it exists.
     */
    where: OrganizationWhereUniqueInput
    /**
     * In case the Organization found by the `where` argument doesn't exist, create a new Organization with this data.
     */
    create: XOR<OrganizationCreateInput, OrganizationUncheckedCreateInput>
    /**
     * In case the Organization was found with the provided `where` argument, update it with this data.
     */
    update: XOR<OrganizationUpdateInput, OrganizationUncheckedUpdateInput>
  }

  /**
   * Organization delete
   */
  export type OrganizationDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Organization
     */
    omit?: OrganizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * Filter which Organization to delete.
     */
    where: OrganizationWhereUniqueInput
  }

  /**
   * Organization deleteMany
   */
  export type OrganizationDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Organizations to delete
     */
    where?: OrganizationWhereInput
    /**
     * Limit how many Organizations to delete.
     */
    limit?: number
  }

  /**
   * Organization.clients
   */
  export type Organization$clientsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Client
     */
    select?: ClientSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Client
     */
    omit?: ClientOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClientInclude<ExtArgs> | null
    where?: ClientWhereInput
    orderBy?: ClientOrderByWithRelationInput | ClientOrderByWithRelationInput[]
    cursor?: ClientWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ClientScalarFieldEnum | ClientScalarFieldEnum[]
  }

  /**
   * Organization.forms
   */
  export type Organization$formsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Form
     */
    select?: FormSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Form
     */
    omit?: FormOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormInclude<ExtArgs> | null
    where?: FormWhereInput
    orderBy?: FormOrderByWithRelationInput | FormOrderByWithRelationInput[]
    cursor?: FormWhereUniqueInput
    take?: number
    skip?: number
    distinct?: FormScalarFieldEnum | FormScalarFieldEnum[]
  }

  /**
   * Organization.members
   */
  export type Organization$membersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OrganizationMember
     */
    select?: OrganizationMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OrganizationMember
     */
    omit?: OrganizationMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationMemberInclude<ExtArgs> | null
    where?: OrganizationMemberWhereInput
    orderBy?: OrganizationMemberOrderByWithRelationInput | OrganizationMemberOrderByWithRelationInput[]
    cursor?: OrganizationMemberWhereUniqueInput
    take?: number
    skip?: number
    distinct?: OrganizationMemberScalarFieldEnum | OrganizationMemberScalarFieldEnum[]
  }

  /**
   * Organization.workers
   */
  export type Organization$workersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Worker
     */
    select?: WorkerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Worker
     */
    omit?: WorkerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkerInclude<ExtArgs> | null
    where?: WorkerWhereInput
    orderBy?: WorkerOrderByWithRelationInput | WorkerOrderByWithRelationInput[]
    cursor?: WorkerWhereUniqueInput
    take?: number
    skip?: number
    distinct?: WorkerScalarFieldEnum | WorkerScalarFieldEnum[]
  }

  /**
   * Organization without action
   */
  export type OrganizationDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Organization
     */
    omit?: OrganizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationInclude<ExtArgs> | null
  }


  /**
   * Model Worker
   */

  export type AggregateWorker = {
    _count: WorkerCountAggregateOutputType | null
    _avg: WorkerAvgAggregateOutputType | null
    _sum: WorkerSumAggregateOutputType | null
    _min: WorkerMinAggregateOutputType | null
    _max: WorkerMaxAggregateOutputType | null
  }

  export type WorkerAvgAggregateOutputType = {
    id: number | null
    organizationId: number | null
  }

  export type WorkerSumAggregateOutputType = {
    id: number | null
    organizationId: number | null
  }

  export type WorkerMinAggregateOutputType = {
    id: number | null
    organizationId: number | null
    firstName: string | null
    lastName: string | null
    jmbg: string | null
    startDate: Date | null
    endDate: Date | null
    createdAt: Date | null
    updatedAt: Date | null
    address: string | null
    email: string | null
    phone: string | null
    role: $Enums.WorkerRole | null
    idCardNumber: string | null
  }

  export type WorkerMaxAggregateOutputType = {
    id: number | null
    organizationId: number | null
    firstName: string | null
    lastName: string | null
    jmbg: string | null
    startDate: Date | null
    endDate: Date | null
    createdAt: Date | null
    updatedAt: Date | null
    address: string | null
    email: string | null
    phone: string | null
    role: $Enums.WorkerRole | null
    idCardNumber: string | null
  }

  export type WorkerCountAggregateOutputType = {
    id: number
    organizationId: number
    firstName: number
    lastName: number
    jmbg: number
    startDate: number
    endDate: number
    createdAt: number
    updatedAt: number
    address: number
    email: number
    phone: number
    role: number
    idCardNumber: number
    _all: number
  }


  export type WorkerAvgAggregateInputType = {
    id?: true
    organizationId?: true
  }

  export type WorkerSumAggregateInputType = {
    id?: true
    organizationId?: true
  }

  export type WorkerMinAggregateInputType = {
    id?: true
    organizationId?: true
    firstName?: true
    lastName?: true
    jmbg?: true
    startDate?: true
    endDate?: true
    createdAt?: true
    updatedAt?: true
    address?: true
    email?: true
    phone?: true
    role?: true
    idCardNumber?: true
  }

  export type WorkerMaxAggregateInputType = {
    id?: true
    organizationId?: true
    firstName?: true
    lastName?: true
    jmbg?: true
    startDate?: true
    endDate?: true
    createdAt?: true
    updatedAt?: true
    address?: true
    email?: true
    phone?: true
    role?: true
    idCardNumber?: true
  }

  export type WorkerCountAggregateInputType = {
    id?: true
    organizationId?: true
    firstName?: true
    lastName?: true
    jmbg?: true
    startDate?: true
    endDate?: true
    createdAt?: true
    updatedAt?: true
    address?: true
    email?: true
    phone?: true
    role?: true
    idCardNumber?: true
    _all?: true
  }

  export type WorkerAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Worker to aggregate.
     */
    where?: WorkerWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Workers to fetch.
     */
    orderBy?: WorkerOrderByWithRelationInput | WorkerOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: WorkerWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Workers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Workers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Workers
    **/
    _count?: true | WorkerCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: WorkerAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: WorkerSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: WorkerMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: WorkerMaxAggregateInputType
  }

  export type GetWorkerAggregateType<T extends WorkerAggregateArgs> = {
        [P in keyof T & keyof AggregateWorker]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateWorker[P]>
      : GetScalarType<T[P], AggregateWorker[P]>
  }




  export type WorkerGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: WorkerWhereInput
    orderBy?: WorkerOrderByWithAggregationInput | WorkerOrderByWithAggregationInput[]
    by: WorkerScalarFieldEnum[] | WorkerScalarFieldEnum
    having?: WorkerScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: WorkerCountAggregateInputType | true
    _avg?: WorkerAvgAggregateInputType
    _sum?: WorkerSumAggregateInputType
    _min?: WorkerMinAggregateInputType
    _max?: WorkerMaxAggregateInputType
  }

  export type WorkerGroupByOutputType = {
    id: number
    organizationId: number
    firstName: string
    lastName: string
    jmbg: string | null
    startDate: Date | null
    endDate: Date | null
    createdAt: Date
    updatedAt: Date
    address: string | null
    email: string | null
    phone: string | null
    role: $Enums.WorkerRole
    idCardNumber: string | null
    _count: WorkerCountAggregateOutputType | null
    _avg: WorkerAvgAggregateOutputType | null
    _sum: WorkerSumAggregateOutputType | null
    _min: WorkerMinAggregateOutputType | null
    _max: WorkerMaxAggregateOutputType | null
  }

  type GetWorkerGroupByPayload<T extends WorkerGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<WorkerGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof WorkerGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], WorkerGroupByOutputType[P]>
            : GetScalarType<T[P], WorkerGroupByOutputType[P]>
        }
      >
    >


  export type WorkerSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    organizationId?: boolean
    firstName?: boolean
    lastName?: boolean
    jmbg?: boolean
    startDate?: boolean
    endDate?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    address?: boolean
    email?: boolean
    phone?: boolean
    role?: boolean
    idCardNumber?: boolean
    organization?: boolean | OrganizationDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["worker"]>



  export type WorkerSelectScalar = {
    id?: boolean
    organizationId?: boolean
    firstName?: boolean
    lastName?: boolean
    jmbg?: boolean
    startDate?: boolean
    endDate?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    address?: boolean
    email?: boolean
    phone?: boolean
    role?: boolean
    idCardNumber?: boolean
  }

  export type WorkerOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "organizationId" | "firstName" | "lastName" | "jmbg" | "startDate" | "endDate" | "createdAt" | "updatedAt" | "address" | "email" | "phone" | "role" | "idCardNumber", ExtArgs["result"]["worker"]>
  export type WorkerInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    organization?: boolean | OrganizationDefaultArgs<ExtArgs>
  }

  export type $WorkerPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Worker"
    objects: {
      organization: Prisma.$OrganizationPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      organizationId: number
      firstName: string
      lastName: string
      jmbg: string | null
      startDate: Date | null
      endDate: Date | null
      createdAt: Date
      updatedAt: Date
      address: string | null
      email: string | null
      phone: string | null
      role: $Enums.WorkerRole
      idCardNumber: string | null
    }, ExtArgs["result"]["worker"]>
    composites: {}
  }

  type WorkerGetPayload<S extends boolean | null | undefined | WorkerDefaultArgs> = $Result.GetResult<Prisma.$WorkerPayload, S>

  type WorkerCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<WorkerFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: WorkerCountAggregateInputType | true
    }

  export interface WorkerDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Worker'], meta: { name: 'Worker' } }
    /**
     * Find zero or one Worker that matches the filter.
     * @param {WorkerFindUniqueArgs} args - Arguments to find a Worker
     * @example
     * // Get one Worker
     * const worker = await prisma.worker.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends WorkerFindUniqueArgs>(args: SelectSubset<T, WorkerFindUniqueArgs<ExtArgs>>): Prisma__WorkerClient<$Result.GetResult<Prisma.$WorkerPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Worker that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {WorkerFindUniqueOrThrowArgs} args - Arguments to find a Worker
     * @example
     * // Get one Worker
     * const worker = await prisma.worker.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends WorkerFindUniqueOrThrowArgs>(args: SelectSubset<T, WorkerFindUniqueOrThrowArgs<ExtArgs>>): Prisma__WorkerClient<$Result.GetResult<Prisma.$WorkerPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Worker that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkerFindFirstArgs} args - Arguments to find a Worker
     * @example
     * // Get one Worker
     * const worker = await prisma.worker.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends WorkerFindFirstArgs>(args?: SelectSubset<T, WorkerFindFirstArgs<ExtArgs>>): Prisma__WorkerClient<$Result.GetResult<Prisma.$WorkerPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Worker that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkerFindFirstOrThrowArgs} args - Arguments to find a Worker
     * @example
     * // Get one Worker
     * const worker = await prisma.worker.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends WorkerFindFirstOrThrowArgs>(args?: SelectSubset<T, WorkerFindFirstOrThrowArgs<ExtArgs>>): Prisma__WorkerClient<$Result.GetResult<Prisma.$WorkerPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Workers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkerFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Workers
     * const workers = await prisma.worker.findMany()
     * 
     * // Get first 10 Workers
     * const workers = await prisma.worker.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const workerWithIdOnly = await prisma.worker.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends WorkerFindManyArgs>(args?: SelectSubset<T, WorkerFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WorkerPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Worker.
     * @param {WorkerCreateArgs} args - Arguments to create a Worker.
     * @example
     * // Create one Worker
     * const Worker = await prisma.worker.create({
     *   data: {
     *     // ... data to create a Worker
     *   }
     * })
     * 
     */
    create<T extends WorkerCreateArgs>(args: SelectSubset<T, WorkerCreateArgs<ExtArgs>>): Prisma__WorkerClient<$Result.GetResult<Prisma.$WorkerPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Workers.
     * @param {WorkerCreateManyArgs} args - Arguments to create many Workers.
     * @example
     * // Create many Workers
     * const worker = await prisma.worker.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends WorkerCreateManyArgs>(args?: SelectSubset<T, WorkerCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Worker.
     * @param {WorkerDeleteArgs} args - Arguments to delete one Worker.
     * @example
     * // Delete one Worker
     * const Worker = await prisma.worker.delete({
     *   where: {
     *     // ... filter to delete one Worker
     *   }
     * })
     * 
     */
    delete<T extends WorkerDeleteArgs>(args: SelectSubset<T, WorkerDeleteArgs<ExtArgs>>): Prisma__WorkerClient<$Result.GetResult<Prisma.$WorkerPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Worker.
     * @param {WorkerUpdateArgs} args - Arguments to update one Worker.
     * @example
     * // Update one Worker
     * const worker = await prisma.worker.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends WorkerUpdateArgs>(args: SelectSubset<T, WorkerUpdateArgs<ExtArgs>>): Prisma__WorkerClient<$Result.GetResult<Prisma.$WorkerPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Workers.
     * @param {WorkerDeleteManyArgs} args - Arguments to filter Workers to delete.
     * @example
     * // Delete a few Workers
     * const { count } = await prisma.worker.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends WorkerDeleteManyArgs>(args?: SelectSubset<T, WorkerDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Workers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkerUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Workers
     * const worker = await prisma.worker.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends WorkerUpdateManyArgs>(args: SelectSubset<T, WorkerUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Worker.
     * @param {WorkerUpsertArgs} args - Arguments to update or create a Worker.
     * @example
     * // Update or create a Worker
     * const worker = await prisma.worker.upsert({
     *   create: {
     *     // ... data to create a Worker
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Worker we want to update
     *   }
     * })
     */
    upsert<T extends WorkerUpsertArgs>(args: SelectSubset<T, WorkerUpsertArgs<ExtArgs>>): Prisma__WorkerClient<$Result.GetResult<Prisma.$WorkerPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Workers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkerCountArgs} args - Arguments to filter Workers to count.
     * @example
     * // Count the number of Workers
     * const count = await prisma.worker.count({
     *   where: {
     *     // ... the filter for the Workers we want to count
     *   }
     * })
    **/
    count<T extends WorkerCountArgs>(
      args?: Subset<T, WorkerCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], WorkerCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Worker.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkerAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends WorkerAggregateArgs>(args: Subset<T, WorkerAggregateArgs>): Prisma.PrismaPromise<GetWorkerAggregateType<T>>

    /**
     * Group by Worker.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkerGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends WorkerGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: WorkerGroupByArgs['orderBy'] }
        : { orderBy?: WorkerGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, WorkerGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetWorkerGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Worker model
   */
  readonly fields: WorkerFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Worker.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__WorkerClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    organization<T extends OrganizationDefaultArgs<ExtArgs> = {}>(args?: Subset<T, OrganizationDefaultArgs<ExtArgs>>): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Worker model
   */
  interface WorkerFieldRefs {
    readonly id: FieldRef<"Worker", 'Int'>
    readonly organizationId: FieldRef<"Worker", 'Int'>
    readonly firstName: FieldRef<"Worker", 'String'>
    readonly lastName: FieldRef<"Worker", 'String'>
    readonly jmbg: FieldRef<"Worker", 'String'>
    readonly startDate: FieldRef<"Worker", 'DateTime'>
    readonly endDate: FieldRef<"Worker", 'DateTime'>
    readonly createdAt: FieldRef<"Worker", 'DateTime'>
    readonly updatedAt: FieldRef<"Worker", 'DateTime'>
    readonly address: FieldRef<"Worker", 'String'>
    readonly email: FieldRef<"Worker", 'String'>
    readonly phone: FieldRef<"Worker", 'String'>
    readonly role: FieldRef<"Worker", 'WorkerRole'>
    readonly idCardNumber: FieldRef<"Worker", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Worker findUnique
   */
  export type WorkerFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Worker
     */
    select?: WorkerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Worker
     */
    omit?: WorkerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkerInclude<ExtArgs> | null
    /**
     * Filter, which Worker to fetch.
     */
    where: WorkerWhereUniqueInput
  }

  /**
   * Worker findUniqueOrThrow
   */
  export type WorkerFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Worker
     */
    select?: WorkerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Worker
     */
    omit?: WorkerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkerInclude<ExtArgs> | null
    /**
     * Filter, which Worker to fetch.
     */
    where: WorkerWhereUniqueInput
  }

  /**
   * Worker findFirst
   */
  export type WorkerFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Worker
     */
    select?: WorkerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Worker
     */
    omit?: WorkerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkerInclude<ExtArgs> | null
    /**
     * Filter, which Worker to fetch.
     */
    where?: WorkerWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Workers to fetch.
     */
    orderBy?: WorkerOrderByWithRelationInput | WorkerOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Workers.
     */
    cursor?: WorkerWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Workers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Workers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Workers.
     */
    distinct?: WorkerScalarFieldEnum | WorkerScalarFieldEnum[]
  }

  /**
   * Worker findFirstOrThrow
   */
  export type WorkerFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Worker
     */
    select?: WorkerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Worker
     */
    omit?: WorkerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkerInclude<ExtArgs> | null
    /**
     * Filter, which Worker to fetch.
     */
    where?: WorkerWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Workers to fetch.
     */
    orderBy?: WorkerOrderByWithRelationInput | WorkerOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Workers.
     */
    cursor?: WorkerWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Workers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Workers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Workers.
     */
    distinct?: WorkerScalarFieldEnum | WorkerScalarFieldEnum[]
  }

  /**
   * Worker findMany
   */
  export type WorkerFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Worker
     */
    select?: WorkerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Worker
     */
    omit?: WorkerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkerInclude<ExtArgs> | null
    /**
     * Filter, which Workers to fetch.
     */
    where?: WorkerWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Workers to fetch.
     */
    orderBy?: WorkerOrderByWithRelationInput | WorkerOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Workers.
     */
    cursor?: WorkerWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Workers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Workers.
     */
    skip?: number
    distinct?: WorkerScalarFieldEnum | WorkerScalarFieldEnum[]
  }

  /**
   * Worker create
   */
  export type WorkerCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Worker
     */
    select?: WorkerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Worker
     */
    omit?: WorkerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkerInclude<ExtArgs> | null
    /**
     * The data needed to create a Worker.
     */
    data: XOR<WorkerCreateInput, WorkerUncheckedCreateInput>
  }

  /**
   * Worker createMany
   */
  export type WorkerCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Workers.
     */
    data: WorkerCreateManyInput | WorkerCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Worker update
   */
  export type WorkerUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Worker
     */
    select?: WorkerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Worker
     */
    omit?: WorkerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkerInclude<ExtArgs> | null
    /**
     * The data needed to update a Worker.
     */
    data: XOR<WorkerUpdateInput, WorkerUncheckedUpdateInput>
    /**
     * Choose, which Worker to update.
     */
    where: WorkerWhereUniqueInput
  }

  /**
   * Worker updateMany
   */
  export type WorkerUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Workers.
     */
    data: XOR<WorkerUpdateManyMutationInput, WorkerUncheckedUpdateManyInput>
    /**
     * Filter which Workers to update
     */
    where?: WorkerWhereInput
    /**
     * Limit how many Workers to update.
     */
    limit?: number
  }

  /**
   * Worker upsert
   */
  export type WorkerUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Worker
     */
    select?: WorkerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Worker
     */
    omit?: WorkerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkerInclude<ExtArgs> | null
    /**
     * The filter to search for the Worker to update in case it exists.
     */
    where: WorkerWhereUniqueInput
    /**
     * In case the Worker found by the `where` argument doesn't exist, create a new Worker with this data.
     */
    create: XOR<WorkerCreateInput, WorkerUncheckedCreateInput>
    /**
     * In case the Worker was found with the provided `where` argument, update it with this data.
     */
    update: XOR<WorkerUpdateInput, WorkerUncheckedUpdateInput>
  }

  /**
   * Worker delete
   */
  export type WorkerDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Worker
     */
    select?: WorkerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Worker
     */
    omit?: WorkerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkerInclude<ExtArgs> | null
    /**
     * Filter which Worker to delete.
     */
    where: WorkerWhereUniqueInput
  }

  /**
   * Worker deleteMany
   */
  export type WorkerDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Workers to delete
     */
    where?: WorkerWhereInput
    /**
     * Limit how many Workers to delete.
     */
    limit?: number
  }

  /**
   * Worker without action
   */
  export type WorkerDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Worker
     */
    select?: WorkerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Worker
     */
    omit?: WorkerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkerInclude<ExtArgs> | null
  }


  /**
   * Model OrganizationMember
   */

  export type AggregateOrganizationMember = {
    _count: OrganizationMemberCountAggregateOutputType | null
    _avg: OrganizationMemberAvgAggregateOutputType | null
    _sum: OrganizationMemberSumAggregateOutputType | null
    _min: OrganizationMemberMinAggregateOutputType | null
    _max: OrganizationMemberMaxAggregateOutputType | null
  }

  export type OrganizationMemberAvgAggregateOutputType = {
    id: number | null
    organizationId: number | null
    userId: number | null
  }

  export type OrganizationMemberSumAggregateOutputType = {
    id: number | null
    organizationId: number | null
    userId: number | null
  }

  export type OrganizationMemberMinAggregateOutputType = {
    id: number | null
    organizationId: number | null
    userId: number | null
    role: $Enums.OrganizationRole | null
    joinedAt: Date | null
  }

  export type OrganizationMemberMaxAggregateOutputType = {
    id: number | null
    organizationId: number | null
    userId: number | null
    role: $Enums.OrganizationRole | null
    joinedAt: Date | null
  }

  export type OrganizationMemberCountAggregateOutputType = {
    id: number
    organizationId: number
    userId: number
    role: number
    joinedAt: number
    _all: number
  }


  export type OrganizationMemberAvgAggregateInputType = {
    id?: true
    organizationId?: true
    userId?: true
  }

  export type OrganizationMemberSumAggregateInputType = {
    id?: true
    organizationId?: true
    userId?: true
  }

  export type OrganizationMemberMinAggregateInputType = {
    id?: true
    organizationId?: true
    userId?: true
    role?: true
    joinedAt?: true
  }

  export type OrganizationMemberMaxAggregateInputType = {
    id?: true
    organizationId?: true
    userId?: true
    role?: true
    joinedAt?: true
  }

  export type OrganizationMemberCountAggregateInputType = {
    id?: true
    organizationId?: true
    userId?: true
    role?: true
    joinedAt?: true
    _all?: true
  }

  export type OrganizationMemberAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which OrganizationMember to aggregate.
     */
    where?: OrganizationMemberWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OrganizationMembers to fetch.
     */
    orderBy?: OrganizationMemberOrderByWithRelationInput | OrganizationMemberOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: OrganizationMemberWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OrganizationMembers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OrganizationMembers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned OrganizationMembers
    **/
    _count?: true | OrganizationMemberCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: OrganizationMemberAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: OrganizationMemberSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: OrganizationMemberMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: OrganizationMemberMaxAggregateInputType
  }

  export type GetOrganizationMemberAggregateType<T extends OrganizationMemberAggregateArgs> = {
        [P in keyof T & keyof AggregateOrganizationMember]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateOrganizationMember[P]>
      : GetScalarType<T[P], AggregateOrganizationMember[P]>
  }




  export type OrganizationMemberGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OrganizationMemberWhereInput
    orderBy?: OrganizationMemberOrderByWithAggregationInput | OrganizationMemberOrderByWithAggregationInput[]
    by: OrganizationMemberScalarFieldEnum[] | OrganizationMemberScalarFieldEnum
    having?: OrganizationMemberScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: OrganizationMemberCountAggregateInputType | true
    _avg?: OrganizationMemberAvgAggregateInputType
    _sum?: OrganizationMemberSumAggregateInputType
    _min?: OrganizationMemberMinAggregateInputType
    _max?: OrganizationMemberMaxAggregateInputType
  }

  export type OrganizationMemberGroupByOutputType = {
    id: number
    organizationId: number
    userId: number
    role: $Enums.OrganizationRole
    joinedAt: Date
    _count: OrganizationMemberCountAggregateOutputType | null
    _avg: OrganizationMemberAvgAggregateOutputType | null
    _sum: OrganizationMemberSumAggregateOutputType | null
    _min: OrganizationMemberMinAggregateOutputType | null
    _max: OrganizationMemberMaxAggregateOutputType | null
  }

  type GetOrganizationMemberGroupByPayload<T extends OrganizationMemberGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<OrganizationMemberGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof OrganizationMemberGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], OrganizationMemberGroupByOutputType[P]>
            : GetScalarType<T[P], OrganizationMemberGroupByOutputType[P]>
        }
      >
    >


  export type OrganizationMemberSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    organizationId?: boolean
    userId?: boolean
    role?: boolean
    joinedAt?: boolean
    organization?: boolean | OrganizationDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["organizationMember"]>



  export type OrganizationMemberSelectScalar = {
    id?: boolean
    organizationId?: boolean
    userId?: boolean
    role?: boolean
    joinedAt?: boolean
  }

  export type OrganizationMemberOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "organizationId" | "userId" | "role" | "joinedAt", ExtArgs["result"]["organizationMember"]>
  export type OrganizationMemberInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    organization?: boolean | OrganizationDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $OrganizationMemberPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "OrganizationMember"
    objects: {
      organization: Prisma.$OrganizationPayload<ExtArgs>
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      organizationId: number
      userId: number
      role: $Enums.OrganizationRole
      joinedAt: Date
    }, ExtArgs["result"]["organizationMember"]>
    composites: {}
  }

  type OrganizationMemberGetPayload<S extends boolean | null | undefined | OrganizationMemberDefaultArgs> = $Result.GetResult<Prisma.$OrganizationMemberPayload, S>

  type OrganizationMemberCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<OrganizationMemberFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: OrganizationMemberCountAggregateInputType | true
    }

  export interface OrganizationMemberDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['OrganizationMember'], meta: { name: 'OrganizationMember' } }
    /**
     * Find zero or one OrganizationMember that matches the filter.
     * @param {OrganizationMemberFindUniqueArgs} args - Arguments to find a OrganizationMember
     * @example
     * // Get one OrganizationMember
     * const organizationMember = await prisma.organizationMember.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends OrganizationMemberFindUniqueArgs>(args: SelectSubset<T, OrganizationMemberFindUniqueArgs<ExtArgs>>): Prisma__OrganizationMemberClient<$Result.GetResult<Prisma.$OrganizationMemberPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one OrganizationMember that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {OrganizationMemberFindUniqueOrThrowArgs} args - Arguments to find a OrganizationMember
     * @example
     * // Get one OrganizationMember
     * const organizationMember = await prisma.organizationMember.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends OrganizationMemberFindUniqueOrThrowArgs>(args: SelectSubset<T, OrganizationMemberFindUniqueOrThrowArgs<ExtArgs>>): Prisma__OrganizationMemberClient<$Result.GetResult<Prisma.$OrganizationMemberPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first OrganizationMember that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationMemberFindFirstArgs} args - Arguments to find a OrganizationMember
     * @example
     * // Get one OrganizationMember
     * const organizationMember = await prisma.organizationMember.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends OrganizationMemberFindFirstArgs>(args?: SelectSubset<T, OrganizationMemberFindFirstArgs<ExtArgs>>): Prisma__OrganizationMemberClient<$Result.GetResult<Prisma.$OrganizationMemberPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first OrganizationMember that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationMemberFindFirstOrThrowArgs} args - Arguments to find a OrganizationMember
     * @example
     * // Get one OrganizationMember
     * const organizationMember = await prisma.organizationMember.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends OrganizationMemberFindFirstOrThrowArgs>(args?: SelectSubset<T, OrganizationMemberFindFirstOrThrowArgs<ExtArgs>>): Prisma__OrganizationMemberClient<$Result.GetResult<Prisma.$OrganizationMemberPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more OrganizationMembers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationMemberFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all OrganizationMembers
     * const organizationMembers = await prisma.organizationMember.findMany()
     * 
     * // Get first 10 OrganizationMembers
     * const organizationMembers = await prisma.organizationMember.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const organizationMemberWithIdOnly = await prisma.organizationMember.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends OrganizationMemberFindManyArgs>(args?: SelectSubset<T, OrganizationMemberFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OrganizationMemberPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a OrganizationMember.
     * @param {OrganizationMemberCreateArgs} args - Arguments to create a OrganizationMember.
     * @example
     * // Create one OrganizationMember
     * const OrganizationMember = await prisma.organizationMember.create({
     *   data: {
     *     // ... data to create a OrganizationMember
     *   }
     * })
     * 
     */
    create<T extends OrganizationMemberCreateArgs>(args: SelectSubset<T, OrganizationMemberCreateArgs<ExtArgs>>): Prisma__OrganizationMemberClient<$Result.GetResult<Prisma.$OrganizationMemberPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many OrganizationMembers.
     * @param {OrganizationMemberCreateManyArgs} args - Arguments to create many OrganizationMembers.
     * @example
     * // Create many OrganizationMembers
     * const organizationMember = await prisma.organizationMember.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends OrganizationMemberCreateManyArgs>(args?: SelectSubset<T, OrganizationMemberCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a OrganizationMember.
     * @param {OrganizationMemberDeleteArgs} args - Arguments to delete one OrganizationMember.
     * @example
     * // Delete one OrganizationMember
     * const OrganizationMember = await prisma.organizationMember.delete({
     *   where: {
     *     // ... filter to delete one OrganizationMember
     *   }
     * })
     * 
     */
    delete<T extends OrganizationMemberDeleteArgs>(args: SelectSubset<T, OrganizationMemberDeleteArgs<ExtArgs>>): Prisma__OrganizationMemberClient<$Result.GetResult<Prisma.$OrganizationMemberPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one OrganizationMember.
     * @param {OrganizationMemberUpdateArgs} args - Arguments to update one OrganizationMember.
     * @example
     * // Update one OrganizationMember
     * const organizationMember = await prisma.organizationMember.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends OrganizationMemberUpdateArgs>(args: SelectSubset<T, OrganizationMemberUpdateArgs<ExtArgs>>): Prisma__OrganizationMemberClient<$Result.GetResult<Prisma.$OrganizationMemberPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more OrganizationMembers.
     * @param {OrganizationMemberDeleteManyArgs} args - Arguments to filter OrganizationMembers to delete.
     * @example
     * // Delete a few OrganizationMembers
     * const { count } = await prisma.organizationMember.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends OrganizationMemberDeleteManyArgs>(args?: SelectSubset<T, OrganizationMemberDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more OrganizationMembers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationMemberUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many OrganizationMembers
     * const organizationMember = await prisma.organizationMember.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends OrganizationMemberUpdateManyArgs>(args: SelectSubset<T, OrganizationMemberUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one OrganizationMember.
     * @param {OrganizationMemberUpsertArgs} args - Arguments to update or create a OrganizationMember.
     * @example
     * // Update or create a OrganizationMember
     * const organizationMember = await prisma.organizationMember.upsert({
     *   create: {
     *     // ... data to create a OrganizationMember
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the OrganizationMember we want to update
     *   }
     * })
     */
    upsert<T extends OrganizationMemberUpsertArgs>(args: SelectSubset<T, OrganizationMemberUpsertArgs<ExtArgs>>): Prisma__OrganizationMemberClient<$Result.GetResult<Prisma.$OrganizationMemberPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of OrganizationMembers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationMemberCountArgs} args - Arguments to filter OrganizationMembers to count.
     * @example
     * // Count the number of OrganizationMembers
     * const count = await prisma.organizationMember.count({
     *   where: {
     *     // ... the filter for the OrganizationMembers we want to count
     *   }
     * })
    **/
    count<T extends OrganizationMemberCountArgs>(
      args?: Subset<T, OrganizationMemberCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], OrganizationMemberCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a OrganizationMember.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationMemberAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends OrganizationMemberAggregateArgs>(args: Subset<T, OrganizationMemberAggregateArgs>): Prisma.PrismaPromise<GetOrganizationMemberAggregateType<T>>

    /**
     * Group by OrganizationMember.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationMemberGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends OrganizationMemberGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: OrganizationMemberGroupByArgs['orderBy'] }
        : { orderBy?: OrganizationMemberGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, OrganizationMemberGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetOrganizationMemberGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the OrganizationMember model
   */
  readonly fields: OrganizationMemberFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for OrganizationMember.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__OrganizationMemberClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    organization<T extends OrganizationDefaultArgs<ExtArgs> = {}>(args?: Subset<T, OrganizationDefaultArgs<ExtArgs>>): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the OrganizationMember model
   */
  interface OrganizationMemberFieldRefs {
    readonly id: FieldRef<"OrganizationMember", 'Int'>
    readonly organizationId: FieldRef<"OrganizationMember", 'Int'>
    readonly userId: FieldRef<"OrganizationMember", 'Int'>
    readonly role: FieldRef<"OrganizationMember", 'OrganizationRole'>
    readonly joinedAt: FieldRef<"OrganizationMember", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * OrganizationMember findUnique
   */
  export type OrganizationMemberFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OrganizationMember
     */
    select?: OrganizationMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OrganizationMember
     */
    omit?: OrganizationMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationMemberInclude<ExtArgs> | null
    /**
     * Filter, which OrganizationMember to fetch.
     */
    where: OrganizationMemberWhereUniqueInput
  }

  /**
   * OrganizationMember findUniqueOrThrow
   */
  export type OrganizationMemberFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OrganizationMember
     */
    select?: OrganizationMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OrganizationMember
     */
    omit?: OrganizationMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationMemberInclude<ExtArgs> | null
    /**
     * Filter, which OrganizationMember to fetch.
     */
    where: OrganizationMemberWhereUniqueInput
  }

  /**
   * OrganizationMember findFirst
   */
  export type OrganizationMemberFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OrganizationMember
     */
    select?: OrganizationMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OrganizationMember
     */
    omit?: OrganizationMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationMemberInclude<ExtArgs> | null
    /**
     * Filter, which OrganizationMember to fetch.
     */
    where?: OrganizationMemberWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OrganizationMembers to fetch.
     */
    orderBy?: OrganizationMemberOrderByWithRelationInput | OrganizationMemberOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for OrganizationMembers.
     */
    cursor?: OrganizationMemberWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OrganizationMembers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OrganizationMembers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of OrganizationMembers.
     */
    distinct?: OrganizationMemberScalarFieldEnum | OrganizationMemberScalarFieldEnum[]
  }

  /**
   * OrganizationMember findFirstOrThrow
   */
  export type OrganizationMemberFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OrganizationMember
     */
    select?: OrganizationMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OrganizationMember
     */
    omit?: OrganizationMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationMemberInclude<ExtArgs> | null
    /**
     * Filter, which OrganizationMember to fetch.
     */
    where?: OrganizationMemberWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OrganizationMembers to fetch.
     */
    orderBy?: OrganizationMemberOrderByWithRelationInput | OrganizationMemberOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for OrganizationMembers.
     */
    cursor?: OrganizationMemberWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OrganizationMembers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OrganizationMembers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of OrganizationMembers.
     */
    distinct?: OrganizationMemberScalarFieldEnum | OrganizationMemberScalarFieldEnum[]
  }

  /**
   * OrganizationMember findMany
   */
  export type OrganizationMemberFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OrganizationMember
     */
    select?: OrganizationMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OrganizationMember
     */
    omit?: OrganizationMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationMemberInclude<ExtArgs> | null
    /**
     * Filter, which OrganizationMembers to fetch.
     */
    where?: OrganizationMemberWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OrganizationMembers to fetch.
     */
    orderBy?: OrganizationMemberOrderByWithRelationInput | OrganizationMemberOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing OrganizationMembers.
     */
    cursor?: OrganizationMemberWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OrganizationMembers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OrganizationMembers.
     */
    skip?: number
    distinct?: OrganizationMemberScalarFieldEnum | OrganizationMemberScalarFieldEnum[]
  }

  /**
   * OrganizationMember create
   */
  export type OrganizationMemberCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OrganizationMember
     */
    select?: OrganizationMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OrganizationMember
     */
    omit?: OrganizationMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationMemberInclude<ExtArgs> | null
    /**
     * The data needed to create a OrganizationMember.
     */
    data: XOR<OrganizationMemberCreateInput, OrganizationMemberUncheckedCreateInput>
  }

  /**
   * OrganizationMember createMany
   */
  export type OrganizationMemberCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many OrganizationMembers.
     */
    data: OrganizationMemberCreateManyInput | OrganizationMemberCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * OrganizationMember update
   */
  export type OrganizationMemberUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OrganizationMember
     */
    select?: OrganizationMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OrganizationMember
     */
    omit?: OrganizationMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationMemberInclude<ExtArgs> | null
    /**
     * The data needed to update a OrganizationMember.
     */
    data: XOR<OrganizationMemberUpdateInput, OrganizationMemberUncheckedUpdateInput>
    /**
     * Choose, which OrganizationMember to update.
     */
    where: OrganizationMemberWhereUniqueInput
  }

  /**
   * OrganizationMember updateMany
   */
  export type OrganizationMemberUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update OrganizationMembers.
     */
    data: XOR<OrganizationMemberUpdateManyMutationInput, OrganizationMemberUncheckedUpdateManyInput>
    /**
     * Filter which OrganizationMembers to update
     */
    where?: OrganizationMemberWhereInput
    /**
     * Limit how many OrganizationMembers to update.
     */
    limit?: number
  }

  /**
   * OrganizationMember upsert
   */
  export type OrganizationMemberUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OrganizationMember
     */
    select?: OrganizationMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OrganizationMember
     */
    omit?: OrganizationMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationMemberInclude<ExtArgs> | null
    /**
     * The filter to search for the OrganizationMember to update in case it exists.
     */
    where: OrganizationMemberWhereUniqueInput
    /**
     * In case the OrganizationMember found by the `where` argument doesn't exist, create a new OrganizationMember with this data.
     */
    create: XOR<OrganizationMemberCreateInput, OrganizationMemberUncheckedCreateInput>
    /**
     * In case the OrganizationMember was found with the provided `where` argument, update it with this data.
     */
    update: XOR<OrganizationMemberUpdateInput, OrganizationMemberUncheckedUpdateInput>
  }

  /**
   * OrganizationMember delete
   */
  export type OrganizationMemberDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OrganizationMember
     */
    select?: OrganizationMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OrganizationMember
     */
    omit?: OrganizationMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationMemberInclude<ExtArgs> | null
    /**
     * Filter which OrganizationMember to delete.
     */
    where: OrganizationMemberWhereUniqueInput
  }

  /**
   * OrganizationMember deleteMany
   */
  export type OrganizationMemberDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which OrganizationMembers to delete
     */
    where?: OrganizationMemberWhereInput
    /**
     * Limit how many OrganizationMembers to delete.
     */
    limit?: number
  }

  /**
   * OrganizationMember without action
   */
  export type OrganizationMemberDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OrganizationMember
     */
    select?: OrganizationMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OrganizationMember
     */
    omit?: OrganizationMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationMemberInclude<ExtArgs> | null
  }


  /**
   * Model Client
   */

  export type AggregateClient = {
    _count: ClientCountAggregateOutputType | null
    _avg: ClientAvgAggregateOutputType | null
    _sum: ClientSumAggregateOutputType | null
    _min: ClientMinAggregateOutputType | null
    _max: ClientMaxAggregateOutputType | null
  }

  export type ClientAvgAggregateOutputType = {
    id: number | null
    organizationId: number | null
    createdById: number | null
  }

  export type ClientSumAggregateOutputType = {
    id: number | null
    organizationId: number | null
    createdById: number | null
  }

  export type ClientMinAggregateOutputType = {
    id: number | null
    organizationId: number | null
    type: $Enums.ClientType | null
    firstName: string | null
    lastName: string | null
    companyName: string | null
    email: string | null
    phone: string | null
    address: string | null
    jmbg: string | null
    taxNumber: string | null
    createdAt: Date | null
    updatedAt: Date | null
    createdById: number | null
    amortizacijaOnly: boolean | null
    idCardNumber: string | null
  }

  export type ClientMaxAggregateOutputType = {
    id: number | null
    organizationId: number | null
    type: $Enums.ClientType | null
    firstName: string | null
    lastName: string | null
    companyName: string | null
    email: string | null
    phone: string | null
    address: string | null
    jmbg: string | null
    taxNumber: string | null
    createdAt: Date | null
    updatedAt: Date | null
    createdById: number | null
    amortizacijaOnly: boolean | null
    idCardNumber: string | null
  }

  export type ClientCountAggregateOutputType = {
    id: number
    organizationId: number
    type: number
    firstName: number
    lastName: number
    companyName: number
    email: number
    phone: number
    address: number
    jmbg: number
    taxNumber: number
    createdAt: number
    updatedAt: number
    createdById: number
    amortizacijaOnly: number
    idCardNumber: number
    _all: number
  }


  export type ClientAvgAggregateInputType = {
    id?: true
    organizationId?: true
    createdById?: true
  }

  export type ClientSumAggregateInputType = {
    id?: true
    organizationId?: true
    createdById?: true
  }

  export type ClientMinAggregateInputType = {
    id?: true
    organizationId?: true
    type?: true
    firstName?: true
    lastName?: true
    companyName?: true
    email?: true
    phone?: true
    address?: true
    jmbg?: true
    taxNumber?: true
    createdAt?: true
    updatedAt?: true
    createdById?: true
    amortizacijaOnly?: true
    idCardNumber?: true
  }

  export type ClientMaxAggregateInputType = {
    id?: true
    organizationId?: true
    type?: true
    firstName?: true
    lastName?: true
    companyName?: true
    email?: true
    phone?: true
    address?: true
    jmbg?: true
    taxNumber?: true
    createdAt?: true
    updatedAt?: true
    createdById?: true
    amortizacijaOnly?: true
    idCardNumber?: true
  }

  export type ClientCountAggregateInputType = {
    id?: true
    organizationId?: true
    type?: true
    firstName?: true
    lastName?: true
    companyName?: true
    email?: true
    phone?: true
    address?: true
    jmbg?: true
    taxNumber?: true
    createdAt?: true
    updatedAt?: true
    createdById?: true
    amortizacijaOnly?: true
    idCardNumber?: true
    _all?: true
  }

  export type ClientAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Client to aggregate.
     */
    where?: ClientWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Clients to fetch.
     */
    orderBy?: ClientOrderByWithRelationInput | ClientOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ClientWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Clients from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Clients.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Clients
    **/
    _count?: true | ClientCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ClientAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ClientSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ClientMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ClientMaxAggregateInputType
  }

  export type GetClientAggregateType<T extends ClientAggregateArgs> = {
        [P in keyof T & keyof AggregateClient]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateClient[P]>
      : GetScalarType<T[P], AggregateClient[P]>
  }




  export type ClientGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ClientWhereInput
    orderBy?: ClientOrderByWithAggregationInput | ClientOrderByWithAggregationInput[]
    by: ClientScalarFieldEnum[] | ClientScalarFieldEnum
    having?: ClientScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ClientCountAggregateInputType | true
    _avg?: ClientAvgAggregateInputType
    _sum?: ClientSumAggregateInputType
    _min?: ClientMinAggregateInputType
    _max?: ClientMaxAggregateInputType
  }

  export type ClientGroupByOutputType = {
    id: number
    organizationId: number | null
    type: $Enums.ClientType
    firstName: string | null
    lastName: string | null
    companyName: string | null
    email: string | null
    phone: string | null
    address: string | null
    jmbg: string | null
    taxNumber: string | null
    createdAt: Date
    updatedAt: Date
    createdById: number | null
    amortizacijaOnly: boolean
    idCardNumber: string | null
    _count: ClientCountAggregateOutputType | null
    _avg: ClientAvgAggregateOutputType | null
    _sum: ClientSumAggregateOutputType | null
    _min: ClientMinAggregateOutputType | null
    _max: ClientMaxAggregateOutputType | null
  }

  type GetClientGroupByPayload<T extends ClientGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ClientGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ClientGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ClientGroupByOutputType[P]>
            : GetScalarType<T[P], ClientGroupByOutputType[P]>
        }
      >
    >


  export type ClientSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    organizationId?: boolean
    type?: boolean
    firstName?: boolean
    lastName?: boolean
    companyName?: boolean
    email?: boolean
    phone?: boolean
    address?: boolean
    jmbg?: boolean
    taxNumber?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    createdById?: boolean
    amortizacijaOnly?: boolean
    idCardNumber?: boolean
    createdBy?: boolean | Client$createdByArgs<ExtArgs>
    organization?: boolean | Client$organizationArgs<ExtArgs>
    forms?: boolean | Client$formsArgs<ExtArgs>
    _count?: boolean | ClientCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["client"]>



  export type ClientSelectScalar = {
    id?: boolean
    organizationId?: boolean
    type?: boolean
    firstName?: boolean
    lastName?: boolean
    companyName?: boolean
    email?: boolean
    phone?: boolean
    address?: boolean
    jmbg?: boolean
    taxNumber?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    createdById?: boolean
    amortizacijaOnly?: boolean
    idCardNumber?: boolean
  }

  export type ClientOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "organizationId" | "type" | "firstName" | "lastName" | "companyName" | "email" | "phone" | "address" | "jmbg" | "taxNumber" | "createdAt" | "updatedAt" | "createdById" | "amortizacijaOnly" | "idCardNumber", ExtArgs["result"]["client"]>
  export type ClientInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    createdBy?: boolean | Client$createdByArgs<ExtArgs>
    organization?: boolean | Client$organizationArgs<ExtArgs>
    forms?: boolean | Client$formsArgs<ExtArgs>
    _count?: boolean | ClientCountOutputTypeDefaultArgs<ExtArgs>
  }

  export type $ClientPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Client"
    objects: {
      createdBy: Prisma.$UserPayload<ExtArgs> | null
      organization: Prisma.$OrganizationPayload<ExtArgs> | null
      forms: Prisma.$FormPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      organizationId: number | null
      type: $Enums.ClientType
      firstName: string | null
      lastName: string | null
      companyName: string | null
      email: string | null
      phone: string | null
      address: string | null
      jmbg: string | null
      taxNumber: string | null
      createdAt: Date
      updatedAt: Date
      createdById: number | null
      amortizacijaOnly: boolean
      idCardNumber: string | null
    }, ExtArgs["result"]["client"]>
    composites: {}
  }

  type ClientGetPayload<S extends boolean | null | undefined | ClientDefaultArgs> = $Result.GetResult<Prisma.$ClientPayload, S>

  type ClientCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ClientFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ClientCountAggregateInputType | true
    }

  export interface ClientDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Client'], meta: { name: 'Client' } }
    /**
     * Find zero or one Client that matches the filter.
     * @param {ClientFindUniqueArgs} args - Arguments to find a Client
     * @example
     * // Get one Client
     * const client = await prisma.client.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ClientFindUniqueArgs>(args: SelectSubset<T, ClientFindUniqueArgs<ExtArgs>>): Prisma__ClientClient<$Result.GetResult<Prisma.$ClientPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Client that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ClientFindUniqueOrThrowArgs} args - Arguments to find a Client
     * @example
     * // Get one Client
     * const client = await prisma.client.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ClientFindUniqueOrThrowArgs>(args: SelectSubset<T, ClientFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ClientClient<$Result.GetResult<Prisma.$ClientPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Client that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ClientFindFirstArgs} args - Arguments to find a Client
     * @example
     * // Get one Client
     * const client = await prisma.client.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ClientFindFirstArgs>(args?: SelectSubset<T, ClientFindFirstArgs<ExtArgs>>): Prisma__ClientClient<$Result.GetResult<Prisma.$ClientPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Client that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ClientFindFirstOrThrowArgs} args - Arguments to find a Client
     * @example
     * // Get one Client
     * const client = await prisma.client.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ClientFindFirstOrThrowArgs>(args?: SelectSubset<T, ClientFindFirstOrThrowArgs<ExtArgs>>): Prisma__ClientClient<$Result.GetResult<Prisma.$ClientPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Clients that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ClientFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Clients
     * const clients = await prisma.client.findMany()
     * 
     * // Get first 10 Clients
     * const clients = await prisma.client.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const clientWithIdOnly = await prisma.client.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ClientFindManyArgs>(args?: SelectSubset<T, ClientFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ClientPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Client.
     * @param {ClientCreateArgs} args - Arguments to create a Client.
     * @example
     * // Create one Client
     * const Client = await prisma.client.create({
     *   data: {
     *     // ... data to create a Client
     *   }
     * })
     * 
     */
    create<T extends ClientCreateArgs>(args: SelectSubset<T, ClientCreateArgs<ExtArgs>>): Prisma__ClientClient<$Result.GetResult<Prisma.$ClientPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Clients.
     * @param {ClientCreateManyArgs} args - Arguments to create many Clients.
     * @example
     * // Create many Clients
     * const client = await prisma.client.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ClientCreateManyArgs>(args?: SelectSubset<T, ClientCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Client.
     * @param {ClientDeleteArgs} args - Arguments to delete one Client.
     * @example
     * // Delete one Client
     * const Client = await prisma.client.delete({
     *   where: {
     *     // ... filter to delete one Client
     *   }
     * })
     * 
     */
    delete<T extends ClientDeleteArgs>(args: SelectSubset<T, ClientDeleteArgs<ExtArgs>>): Prisma__ClientClient<$Result.GetResult<Prisma.$ClientPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Client.
     * @param {ClientUpdateArgs} args - Arguments to update one Client.
     * @example
     * // Update one Client
     * const client = await prisma.client.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ClientUpdateArgs>(args: SelectSubset<T, ClientUpdateArgs<ExtArgs>>): Prisma__ClientClient<$Result.GetResult<Prisma.$ClientPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Clients.
     * @param {ClientDeleteManyArgs} args - Arguments to filter Clients to delete.
     * @example
     * // Delete a few Clients
     * const { count } = await prisma.client.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ClientDeleteManyArgs>(args?: SelectSubset<T, ClientDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Clients.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ClientUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Clients
     * const client = await prisma.client.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ClientUpdateManyArgs>(args: SelectSubset<T, ClientUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Client.
     * @param {ClientUpsertArgs} args - Arguments to update or create a Client.
     * @example
     * // Update or create a Client
     * const client = await prisma.client.upsert({
     *   create: {
     *     // ... data to create a Client
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Client we want to update
     *   }
     * })
     */
    upsert<T extends ClientUpsertArgs>(args: SelectSubset<T, ClientUpsertArgs<ExtArgs>>): Prisma__ClientClient<$Result.GetResult<Prisma.$ClientPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Clients.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ClientCountArgs} args - Arguments to filter Clients to count.
     * @example
     * // Count the number of Clients
     * const count = await prisma.client.count({
     *   where: {
     *     // ... the filter for the Clients we want to count
     *   }
     * })
    **/
    count<T extends ClientCountArgs>(
      args?: Subset<T, ClientCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ClientCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Client.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ClientAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ClientAggregateArgs>(args: Subset<T, ClientAggregateArgs>): Prisma.PrismaPromise<GetClientAggregateType<T>>

    /**
     * Group by Client.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ClientGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ClientGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ClientGroupByArgs['orderBy'] }
        : { orderBy?: ClientGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ClientGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetClientGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Client model
   */
  readonly fields: ClientFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Client.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ClientClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    createdBy<T extends Client$createdByArgs<ExtArgs> = {}>(args?: Subset<T, Client$createdByArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    organization<T extends Client$organizationArgs<ExtArgs> = {}>(args?: Subset<T, Client$organizationArgs<ExtArgs>>): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    forms<T extends Client$formsArgs<ExtArgs> = {}>(args?: Subset<T, Client$formsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FormPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Client model
   */
  interface ClientFieldRefs {
    readonly id: FieldRef<"Client", 'Int'>
    readonly organizationId: FieldRef<"Client", 'Int'>
    readonly type: FieldRef<"Client", 'ClientType'>
    readonly firstName: FieldRef<"Client", 'String'>
    readonly lastName: FieldRef<"Client", 'String'>
    readonly companyName: FieldRef<"Client", 'String'>
    readonly email: FieldRef<"Client", 'String'>
    readonly phone: FieldRef<"Client", 'String'>
    readonly address: FieldRef<"Client", 'String'>
    readonly jmbg: FieldRef<"Client", 'String'>
    readonly taxNumber: FieldRef<"Client", 'String'>
    readonly createdAt: FieldRef<"Client", 'DateTime'>
    readonly updatedAt: FieldRef<"Client", 'DateTime'>
    readonly createdById: FieldRef<"Client", 'Int'>
    readonly amortizacijaOnly: FieldRef<"Client", 'Boolean'>
    readonly idCardNumber: FieldRef<"Client", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Client findUnique
   */
  export type ClientFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Client
     */
    select?: ClientSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Client
     */
    omit?: ClientOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClientInclude<ExtArgs> | null
    /**
     * Filter, which Client to fetch.
     */
    where: ClientWhereUniqueInput
  }

  /**
   * Client findUniqueOrThrow
   */
  export type ClientFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Client
     */
    select?: ClientSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Client
     */
    omit?: ClientOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClientInclude<ExtArgs> | null
    /**
     * Filter, which Client to fetch.
     */
    where: ClientWhereUniqueInput
  }

  /**
   * Client findFirst
   */
  export type ClientFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Client
     */
    select?: ClientSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Client
     */
    omit?: ClientOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClientInclude<ExtArgs> | null
    /**
     * Filter, which Client to fetch.
     */
    where?: ClientWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Clients to fetch.
     */
    orderBy?: ClientOrderByWithRelationInput | ClientOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Clients.
     */
    cursor?: ClientWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Clients from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Clients.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Clients.
     */
    distinct?: ClientScalarFieldEnum | ClientScalarFieldEnum[]
  }

  /**
   * Client findFirstOrThrow
   */
  export type ClientFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Client
     */
    select?: ClientSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Client
     */
    omit?: ClientOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClientInclude<ExtArgs> | null
    /**
     * Filter, which Client to fetch.
     */
    where?: ClientWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Clients to fetch.
     */
    orderBy?: ClientOrderByWithRelationInput | ClientOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Clients.
     */
    cursor?: ClientWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Clients from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Clients.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Clients.
     */
    distinct?: ClientScalarFieldEnum | ClientScalarFieldEnum[]
  }

  /**
   * Client findMany
   */
  export type ClientFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Client
     */
    select?: ClientSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Client
     */
    omit?: ClientOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClientInclude<ExtArgs> | null
    /**
     * Filter, which Clients to fetch.
     */
    where?: ClientWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Clients to fetch.
     */
    orderBy?: ClientOrderByWithRelationInput | ClientOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Clients.
     */
    cursor?: ClientWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Clients from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Clients.
     */
    skip?: number
    distinct?: ClientScalarFieldEnum | ClientScalarFieldEnum[]
  }

  /**
   * Client create
   */
  export type ClientCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Client
     */
    select?: ClientSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Client
     */
    omit?: ClientOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClientInclude<ExtArgs> | null
    /**
     * The data needed to create a Client.
     */
    data: XOR<ClientCreateInput, ClientUncheckedCreateInput>
  }

  /**
   * Client createMany
   */
  export type ClientCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Clients.
     */
    data: ClientCreateManyInput | ClientCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Client update
   */
  export type ClientUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Client
     */
    select?: ClientSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Client
     */
    omit?: ClientOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClientInclude<ExtArgs> | null
    /**
     * The data needed to update a Client.
     */
    data: XOR<ClientUpdateInput, ClientUncheckedUpdateInput>
    /**
     * Choose, which Client to update.
     */
    where: ClientWhereUniqueInput
  }

  /**
   * Client updateMany
   */
  export type ClientUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Clients.
     */
    data: XOR<ClientUpdateManyMutationInput, ClientUncheckedUpdateManyInput>
    /**
     * Filter which Clients to update
     */
    where?: ClientWhereInput
    /**
     * Limit how many Clients to update.
     */
    limit?: number
  }

  /**
   * Client upsert
   */
  export type ClientUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Client
     */
    select?: ClientSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Client
     */
    omit?: ClientOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClientInclude<ExtArgs> | null
    /**
     * The filter to search for the Client to update in case it exists.
     */
    where: ClientWhereUniqueInput
    /**
     * In case the Client found by the `where` argument doesn't exist, create a new Client with this data.
     */
    create: XOR<ClientCreateInput, ClientUncheckedCreateInput>
    /**
     * In case the Client was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ClientUpdateInput, ClientUncheckedUpdateInput>
  }

  /**
   * Client delete
   */
  export type ClientDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Client
     */
    select?: ClientSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Client
     */
    omit?: ClientOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClientInclude<ExtArgs> | null
    /**
     * Filter which Client to delete.
     */
    where: ClientWhereUniqueInput
  }

  /**
   * Client deleteMany
   */
  export type ClientDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Clients to delete
     */
    where?: ClientWhereInput
    /**
     * Limit how many Clients to delete.
     */
    limit?: number
  }

  /**
   * Client.createdBy
   */
  export type Client$createdByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * Client.organization
   */
  export type Client$organizationArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Organization
     */
    omit?: OrganizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationInclude<ExtArgs> | null
    where?: OrganizationWhereInput
  }

  /**
   * Client.forms
   */
  export type Client$formsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Form
     */
    select?: FormSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Form
     */
    omit?: FormOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormInclude<ExtArgs> | null
    where?: FormWhereInput
    orderBy?: FormOrderByWithRelationInput | FormOrderByWithRelationInput[]
    cursor?: FormWhereUniqueInput
    take?: number
    skip?: number
    distinct?: FormScalarFieldEnum | FormScalarFieldEnum[]
  }

  /**
   * Client without action
   */
  export type ClientDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Client
     */
    select?: ClientSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Client
     */
    omit?: ClientOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClientInclude<ExtArgs> | null
  }


  /**
   * Model Form
   */

  export type AggregateForm = {
    _count: FormCountAggregateOutputType | null
    _avg: FormAvgAggregateOutputType | null
    _sum: FormSumAggregateOutputType | null
    _min: FormMinAggregateOutputType | null
    _max: FormMaxAggregateOutputType | null
  }

  export type FormAvgAggregateOutputType = {
    id: number | null
    year: number | null
    month: number | null
    organizationId: number | null
    clientId: number | null
    createdById: number | null
    updatedById: number | null
  }

  export type FormSumAggregateOutputType = {
    id: number | null
    year: number | null
    month: number | null
    organizationId: number | null
    clientId: number | null
    createdById: number | null
    updatedById: number | null
  }

  export type FormMinAggregateOutputType = {
    id: number | null
    type: $Enums.forms_type | null
    status: $Enums.FormStatus | null
    year: number | null
    month: number | null
    title: string | null
    organizationId: number | null
    clientId: number | null
    createdById: number | null
    updatedById: number | null
    pdfUrl: string | null
    notes: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type FormMaxAggregateOutputType = {
    id: number | null
    type: $Enums.forms_type | null
    status: $Enums.FormStatus | null
    year: number | null
    month: number | null
    title: string | null
    organizationId: number | null
    clientId: number | null
    createdById: number | null
    updatedById: number | null
    pdfUrl: string | null
    notes: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type FormCountAggregateOutputType = {
    id: number
    type: number
    status: number
    year: number
    month: number
    title: number
    organizationId: number
    clientId: number
    createdById: number
    updatedById: number
    pdfUrl: number
    notes: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type FormAvgAggregateInputType = {
    id?: true
    year?: true
    month?: true
    organizationId?: true
    clientId?: true
    createdById?: true
    updatedById?: true
  }

  export type FormSumAggregateInputType = {
    id?: true
    year?: true
    month?: true
    organizationId?: true
    clientId?: true
    createdById?: true
    updatedById?: true
  }

  export type FormMinAggregateInputType = {
    id?: true
    type?: true
    status?: true
    year?: true
    month?: true
    title?: true
    organizationId?: true
    clientId?: true
    createdById?: true
    updatedById?: true
    pdfUrl?: true
    notes?: true
    createdAt?: true
    updatedAt?: true
  }

  export type FormMaxAggregateInputType = {
    id?: true
    type?: true
    status?: true
    year?: true
    month?: true
    title?: true
    organizationId?: true
    clientId?: true
    createdById?: true
    updatedById?: true
    pdfUrl?: true
    notes?: true
    createdAt?: true
    updatedAt?: true
  }

  export type FormCountAggregateInputType = {
    id?: true
    type?: true
    status?: true
    year?: true
    month?: true
    title?: true
    organizationId?: true
    clientId?: true
    createdById?: true
    updatedById?: true
    pdfUrl?: true
    notes?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type FormAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Form to aggregate.
     */
    where?: FormWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Forms to fetch.
     */
    orderBy?: FormOrderByWithRelationInput | FormOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: FormWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Forms from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Forms.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Forms
    **/
    _count?: true | FormCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: FormAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: FormSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: FormMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: FormMaxAggregateInputType
  }

  export type GetFormAggregateType<T extends FormAggregateArgs> = {
        [P in keyof T & keyof AggregateForm]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateForm[P]>
      : GetScalarType<T[P], AggregateForm[P]>
  }




  export type FormGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FormWhereInput
    orderBy?: FormOrderByWithAggregationInput | FormOrderByWithAggregationInput[]
    by: FormScalarFieldEnum[] | FormScalarFieldEnum
    having?: FormScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: FormCountAggregateInputType | true
    _avg?: FormAvgAggregateInputType
    _sum?: FormSumAggregateInputType
    _min?: FormMinAggregateInputType
    _max?: FormMaxAggregateInputType
  }

  export type FormGroupByOutputType = {
    id: number
    type: $Enums.forms_type
    status: $Enums.FormStatus
    year: number
    month: number | null
    title: string | null
    organizationId: number | null
    clientId: number | null
    createdById: number
    updatedById: number | null
    pdfUrl: string | null
    notes: string | null
    createdAt: Date
    updatedAt: Date
    _count: FormCountAggregateOutputType | null
    _avg: FormAvgAggregateOutputType | null
    _sum: FormSumAggregateOutputType | null
    _min: FormMinAggregateOutputType | null
    _max: FormMaxAggregateOutputType | null
  }

  type GetFormGroupByPayload<T extends FormGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<FormGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof FormGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], FormGroupByOutputType[P]>
            : GetScalarType<T[P], FormGroupByOutputType[P]>
        }
      >
    >


  export type FormSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    type?: boolean
    status?: boolean
    year?: boolean
    month?: boolean
    title?: boolean
    organizationId?: boolean
    clientId?: boolean
    createdById?: boolean
    updatedById?: boolean
    pdfUrl?: boolean
    notes?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    attachments?: boolean | Form$attachmentsArgs<ExtArgs>
    versions?: boolean | Form$versionsArgs<ExtArgs>
    client?: boolean | Form$clientArgs<ExtArgs>
    createdBy?: boolean | UserDefaultArgs<ExtArgs>
    organization?: boolean | Form$organizationArgs<ExtArgs>
    updatedBy?: boolean | Form$updatedByArgs<ExtArgs>
    _count?: boolean | FormCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["form"]>



  export type FormSelectScalar = {
    id?: boolean
    type?: boolean
    status?: boolean
    year?: boolean
    month?: boolean
    title?: boolean
    organizationId?: boolean
    clientId?: boolean
    createdById?: boolean
    updatedById?: boolean
    pdfUrl?: boolean
    notes?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type FormOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "type" | "status" | "year" | "month" | "title" | "organizationId" | "clientId" | "createdById" | "updatedById" | "pdfUrl" | "notes" | "createdAt" | "updatedAt", ExtArgs["result"]["form"]>
  export type FormInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    attachments?: boolean | Form$attachmentsArgs<ExtArgs>
    versions?: boolean | Form$versionsArgs<ExtArgs>
    client?: boolean | Form$clientArgs<ExtArgs>
    createdBy?: boolean | UserDefaultArgs<ExtArgs>
    organization?: boolean | Form$organizationArgs<ExtArgs>
    updatedBy?: boolean | Form$updatedByArgs<ExtArgs>
    _count?: boolean | FormCountOutputTypeDefaultArgs<ExtArgs>
  }

  export type $FormPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Form"
    objects: {
      attachments: Prisma.$FormAttachmentPayload<ExtArgs>[]
      versions: Prisma.$FormVersionPayload<ExtArgs>[]
      client: Prisma.$ClientPayload<ExtArgs> | null
      createdBy: Prisma.$UserPayload<ExtArgs>
      organization: Prisma.$OrganizationPayload<ExtArgs> | null
      updatedBy: Prisma.$UserPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      type: $Enums.forms_type
      status: $Enums.FormStatus
      year: number
      month: number | null
      title: string | null
      organizationId: number | null
      clientId: number | null
      createdById: number
      updatedById: number | null
      pdfUrl: string | null
      notes: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["form"]>
    composites: {}
  }

  type FormGetPayload<S extends boolean | null | undefined | FormDefaultArgs> = $Result.GetResult<Prisma.$FormPayload, S>

  type FormCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<FormFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: FormCountAggregateInputType | true
    }

  export interface FormDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Form'], meta: { name: 'Form' } }
    /**
     * Find zero or one Form that matches the filter.
     * @param {FormFindUniqueArgs} args - Arguments to find a Form
     * @example
     * // Get one Form
     * const form = await prisma.form.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends FormFindUniqueArgs>(args: SelectSubset<T, FormFindUniqueArgs<ExtArgs>>): Prisma__FormClient<$Result.GetResult<Prisma.$FormPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Form that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {FormFindUniqueOrThrowArgs} args - Arguments to find a Form
     * @example
     * // Get one Form
     * const form = await prisma.form.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends FormFindUniqueOrThrowArgs>(args: SelectSubset<T, FormFindUniqueOrThrowArgs<ExtArgs>>): Prisma__FormClient<$Result.GetResult<Prisma.$FormPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Form that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FormFindFirstArgs} args - Arguments to find a Form
     * @example
     * // Get one Form
     * const form = await prisma.form.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends FormFindFirstArgs>(args?: SelectSubset<T, FormFindFirstArgs<ExtArgs>>): Prisma__FormClient<$Result.GetResult<Prisma.$FormPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Form that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FormFindFirstOrThrowArgs} args - Arguments to find a Form
     * @example
     * // Get one Form
     * const form = await prisma.form.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends FormFindFirstOrThrowArgs>(args?: SelectSubset<T, FormFindFirstOrThrowArgs<ExtArgs>>): Prisma__FormClient<$Result.GetResult<Prisma.$FormPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Forms that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FormFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Forms
     * const forms = await prisma.form.findMany()
     * 
     * // Get first 10 Forms
     * const forms = await prisma.form.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const formWithIdOnly = await prisma.form.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends FormFindManyArgs>(args?: SelectSubset<T, FormFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FormPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Form.
     * @param {FormCreateArgs} args - Arguments to create a Form.
     * @example
     * // Create one Form
     * const Form = await prisma.form.create({
     *   data: {
     *     // ... data to create a Form
     *   }
     * })
     * 
     */
    create<T extends FormCreateArgs>(args: SelectSubset<T, FormCreateArgs<ExtArgs>>): Prisma__FormClient<$Result.GetResult<Prisma.$FormPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Forms.
     * @param {FormCreateManyArgs} args - Arguments to create many Forms.
     * @example
     * // Create many Forms
     * const form = await prisma.form.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends FormCreateManyArgs>(args?: SelectSubset<T, FormCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Form.
     * @param {FormDeleteArgs} args - Arguments to delete one Form.
     * @example
     * // Delete one Form
     * const Form = await prisma.form.delete({
     *   where: {
     *     // ... filter to delete one Form
     *   }
     * })
     * 
     */
    delete<T extends FormDeleteArgs>(args: SelectSubset<T, FormDeleteArgs<ExtArgs>>): Prisma__FormClient<$Result.GetResult<Prisma.$FormPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Form.
     * @param {FormUpdateArgs} args - Arguments to update one Form.
     * @example
     * // Update one Form
     * const form = await prisma.form.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends FormUpdateArgs>(args: SelectSubset<T, FormUpdateArgs<ExtArgs>>): Prisma__FormClient<$Result.GetResult<Prisma.$FormPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Forms.
     * @param {FormDeleteManyArgs} args - Arguments to filter Forms to delete.
     * @example
     * // Delete a few Forms
     * const { count } = await prisma.form.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends FormDeleteManyArgs>(args?: SelectSubset<T, FormDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Forms.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FormUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Forms
     * const form = await prisma.form.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends FormUpdateManyArgs>(args: SelectSubset<T, FormUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Form.
     * @param {FormUpsertArgs} args - Arguments to update or create a Form.
     * @example
     * // Update or create a Form
     * const form = await prisma.form.upsert({
     *   create: {
     *     // ... data to create a Form
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Form we want to update
     *   }
     * })
     */
    upsert<T extends FormUpsertArgs>(args: SelectSubset<T, FormUpsertArgs<ExtArgs>>): Prisma__FormClient<$Result.GetResult<Prisma.$FormPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Forms.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FormCountArgs} args - Arguments to filter Forms to count.
     * @example
     * // Count the number of Forms
     * const count = await prisma.form.count({
     *   where: {
     *     // ... the filter for the Forms we want to count
     *   }
     * })
    **/
    count<T extends FormCountArgs>(
      args?: Subset<T, FormCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], FormCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Form.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FormAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends FormAggregateArgs>(args: Subset<T, FormAggregateArgs>): Prisma.PrismaPromise<GetFormAggregateType<T>>

    /**
     * Group by Form.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FormGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends FormGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: FormGroupByArgs['orderBy'] }
        : { orderBy?: FormGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, FormGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetFormGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Form model
   */
  readonly fields: FormFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Form.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__FormClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    attachments<T extends Form$attachmentsArgs<ExtArgs> = {}>(args?: Subset<T, Form$attachmentsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FormAttachmentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    versions<T extends Form$versionsArgs<ExtArgs> = {}>(args?: Subset<T, Form$versionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FormVersionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    client<T extends Form$clientArgs<ExtArgs> = {}>(args?: Subset<T, Form$clientArgs<ExtArgs>>): Prisma__ClientClient<$Result.GetResult<Prisma.$ClientPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    createdBy<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    organization<T extends Form$organizationArgs<ExtArgs> = {}>(args?: Subset<T, Form$organizationArgs<ExtArgs>>): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    updatedBy<T extends Form$updatedByArgs<ExtArgs> = {}>(args?: Subset<T, Form$updatedByArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Form model
   */
  interface FormFieldRefs {
    readonly id: FieldRef<"Form", 'Int'>
    readonly type: FieldRef<"Form", 'forms_type'>
    readonly status: FieldRef<"Form", 'FormStatus'>
    readonly year: FieldRef<"Form", 'Int'>
    readonly month: FieldRef<"Form", 'Int'>
    readonly title: FieldRef<"Form", 'String'>
    readonly organizationId: FieldRef<"Form", 'Int'>
    readonly clientId: FieldRef<"Form", 'Int'>
    readonly createdById: FieldRef<"Form", 'Int'>
    readonly updatedById: FieldRef<"Form", 'Int'>
    readonly pdfUrl: FieldRef<"Form", 'String'>
    readonly notes: FieldRef<"Form", 'String'>
    readonly createdAt: FieldRef<"Form", 'DateTime'>
    readonly updatedAt: FieldRef<"Form", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Form findUnique
   */
  export type FormFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Form
     */
    select?: FormSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Form
     */
    omit?: FormOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormInclude<ExtArgs> | null
    /**
     * Filter, which Form to fetch.
     */
    where: FormWhereUniqueInput
  }

  /**
   * Form findUniqueOrThrow
   */
  export type FormFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Form
     */
    select?: FormSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Form
     */
    omit?: FormOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormInclude<ExtArgs> | null
    /**
     * Filter, which Form to fetch.
     */
    where: FormWhereUniqueInput
  }

  /**
   * Form findFirst
   */
  export type FormFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Form
     */
    select?: FormSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Form
     */
    omit?: FormOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormInclude<ExtArgs> | null
    /**
     * Filter, which Form to fetch.
     */
    where?: FormWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Forms to fetch.
     */
    orderBy?: FormOrderByWithRelationInput | FormOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Forms.
     */
    cursor?: FormWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Forms from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Forms.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Forms.
     */
    distinct?: FormScalarFieldEnum | FormScalarFieldEnum[]
  }

  /**
   * Form findFirstOrThrow
   */
  export type FormFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Form
     */
    select?: FormSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Form
     */
    omit?: FormOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormInclude<ExtArgs> | null
    /**
     * Filter, which Form to fetch.
     */
    where?: FormWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Forms to fetch.
     */
    orderBy?: FormOrderByWithRelationInput | FormOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Forms.
     */
    cursor?: FormWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Forms from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Forms.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Forms.
     */
    distinct?: FormScalarFieldEnum | FormScalarFieldEnum[]
  }

  /**
   * Form findMany
   */
  export type FormFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Form
     */
    select?: FormSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Form
     */
    omit?: FormOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormInclude<ExtArgs> | null
    /**
     * Filter, which Forms to fetch.
     */
    where?: FormWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Forms to fetch.
     */
    orderBy?: FormOrderByWithRelationInput | FormOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Forms.
     */
    cursor?: FormWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Forms from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Forms.
     */
    skip?: number
    distinct?: FormScalarFieldEnum | FormScalarFieldEnum[]
  }

  /**
   * Form create
   */
  export type FormCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Form
     */
    select?: FormSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Form
     */
    omit?: FormOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormInclude<ExtArgs> | null
    /**
     * The data needed to create a Form.
     */
    data: XOR<FormCreateInput, FormUncheckedCreateInput>
  }

  /**
   * Form createMany
   */
  export type FormCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Forms.
     */
    data: FormCreateManyInput | FormCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Form update
   */
  export type FormUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Form
     */
    select?: FormSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Form
     */
    omit?: FormOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormInclude<ExtArgs> | null
    /**
     * The data needed to update a Form.
     */
    data: XOR<FormUpdateInput, FormUncheckedUpdateInput>
    /**
     * Choose, which Form to update.
     */
    where: FormWhereUniqueInput
  }

  /**
   * Form updateMany
   */
  export type FormUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Forms.
     */
    data: XOR<FormUpdateManyMutationInput, FormUncheckedUpdateManyInput>
    /**
     * Filter which Forms to update
     */
    where?: FormWhereInput
    /**
     * Limit how many Forms to update.
     */
    limit?: number
  }

  /**
   * Form upsert
   */
  export type FormUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Form
     */
    select?: FormSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Form
     */
    omit?: FormOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormInclude<ExtArgs> | null
    /**
     * The filter to search for the Form to update in case it exists.
     */
    where: FormWhereUniqueInput
    /**
     * In case the Form found by the `where` argument doesn't exist, create a new Form with this data.
     */
    create: XOR<FormCreateInput, FormUncheckedCreateInput>
    /**
     * In case the Form was found with the provided `where` argument, update it with this data.
     */
    update: XOR<FormUpdateInput, FormUncheckedUpdateInput>
  }

  /**
   * Form delete
   */
  export type FormDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Form
     */
    select?: FormSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Form
     */
    omit?: FormOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormInclude<ExtArgs> | null
    /**
     * Filter which Form to delete.
     */
    where: FormWhereUniqueInput
  }

  /**
   * Form deleteMany
   */
  export type FormDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Forms to delete
     */
    where?: FormWhereInput
    /**
     * Limit how many Forms to delete.
     */
    limit?: number
  }

  /**
   * Form.attachments
   */
  export type Form$attachmentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FormAttachment
     */
    select?: FormAttachmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FormAttachment
     */
    omit?: FormAttachmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormAttachmentInclude<ExtArgs> | null
    where?: FormAttachmentWhereInput
    orderBy?: FormAttachmentOrderByWithRelationInput | FormAttachmentOrderByWithRelationInput[]
    cursor?: FormAttachmentWhereUniqueInput
    take?: number
    skip?: number
    distinct?: FormAttachmentScalarFieldEnum | FormAttachmentScalarFieldEnum[]
  }

  /**
   * Form.versions
   */
  export type Form$versionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FormVersion
     */
    select?: FormVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FormVersion
     */
    omit?: FormVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormVersionInclude<ExtArgs> | null
    where?: FormVersionWhereInput
    orderBy?: FormVersionOrderByWithRelationInput | FormVersionOrderByWithRelationInput[]
    cursor?: FormVersionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: FormVersionScalarFieldEnum | FormVersionScalarFieldEnum[]
  }

  /**
   * Form.client
   */
  export type Form$clientArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Client
     */
    select?: ClientSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Client
     */
    omit?: ClientOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClientInclude<ExtArgs> | null
    where?: ClientWhereInput
  }

  /**
   * Form.organization
   */
  export type Form$organizationArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Organization
     */
    omit?: OrganizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationInclude<ExtArgs> | null
    where?: OrganizationWhereInput
  }

  /**
   * Form.updatedBy
   */
  export type Form$updatedByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * Form without action
   */
  export type FormDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Form
     */
    select?: FormSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Form
     */
    omit?: FormOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormInclude<ExtArgs> | null
  }


  /**
   * Model FormVersion
   */

  export type AggregateFormVersion = {
    _count: FormVersionCountAggregateOutputType | null
    _avg: FormVersionAvgAggregateOutputType | null
    _sum: FormVersionSumAggregateOutputType | null
    _min: FormVersionMinAggregateOutputType | null
    _max: FormVersionMaxAggregateOutputType | null
  }

  export type FormVersionAvgAggregateOutputType = {
    id: number | null
    formId: number | null
    versionNumber: number | null
  }

  export type FormVersionSumAggregateOutputType = {
    id: number | null
    formId: number | null
    versionNumber: number | null
  }

  export type FormVersionMinAggregateOutputType = {
    id: number | null
    formId: number | null
    versionNumber: number | null
    data: string | null
    pdfUrl: string | null
    createdAt: Date | null
  }

  export type FormVersionMaxAggregateOutputType = {
    id: number | null
    formId: number | null
    versionNumber: number | null
    data: string | null
    pdfUrl: string | null
    createdAt: Date | null
  }

  export type FormVersionCountAggregateOutputType = {
    id: number
    formId: number
    versionNumber: number
    data: number
    pdfUrl: number
    createdAt: number
    _all: number
  }


  export type FormVersionAvgAggregateInputType = {
    id?: true
    formId?: true
    versionNumber?: true
  }

  export type FormVersionSumAggregateInputType = {
    id?: true
    formId?: true
    versionNumber?: true
  }

  export type FormVersionMinAggregateInputType = {
    id?: true
    formId?: true
    versionNumber?: true
    data?: true
    pdfUrl?: true
    createdAt?: true
  }

  export type FormVersionMaxAggregateInputType = {
    id?: true
    formId?: true
    versionNumber?: true
    data?: true
    pdfUrl?: true
    createdAt?: true
  }

  export type FormVersionCountAggregateInputType = {
    id?: true
    formId?: true
    versionNumber?: true
    data?: true
    pdfUrl?: true
    createdAt?: true
    _all?: true
  }

  export type FormVersionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which FormVersion to aggregate.
     */
    where?: FormVersionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FormVersions to fetch.
     */
    orderBy?: FormVersionOrderByWithRelationInput | FormVersionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: FormVersionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FormVersions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FormVersions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned FormVersions
    **/
    _count?: true | FormVersionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: FormVersionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: FormVersionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: FormVersionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: FormVersionMaxAggregateInputType
  }

  export type GetFormVersionAggregateType<T extends FormVersionAggregateArgs> = {
        [P in keyof T & keyof AggregateFormVersion]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateFormVersion[P]>
      : GetScalarType<T[P], AggregateFormVersion[P]>
  }




  export type FormVersionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FormVersionWhereInput
    orderBy?: FormVersionOrderByWithAggregationInput | FormVersionOrderByWithAggregationInput[]
    by: FormVersionScalarFieldEnum[] | FormVersionScalarFieldEnum
    having?: FormVersionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: FormVersionCountAggregateInputType | true
    _avg?: FormVersionAvgAggregateInputType
    _sum?: FormVersionSumAggregateInputType
    _min?: FormVersionMinAggregateInputType
    _max?: FormVersionMaxAggregateInputType
  }

  export type FormVersionGroupByOutputType = {
    id: number
    formId: number
    versionNumber: number
    data: string
    pdfUrl: string | null
    createdAt: Date
    _count: FormVersionCountAggregateOutputType | null
    _avg: FormVersionAvgAggregateOutputType | null
    _sum: FormVersionSumAggregateOutputType | null
    _min: FormVersionMinAggregateOutputType | null
    _max: FormVersionMaxAggregateOutputType | null
  }

  type GetFormVersionGroupByPayload<T extends FormVersionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<FormVersionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof FormVersionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], FormVersionGroupByOutputType[P]>
            : GetScalarType<T[P], FormVersionGroupByOutputType[P]>
        }
      >
    >


  export type FormVersionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    formId?: boolean
    versionNumber?: boolean
    data?: boolean
    pdfUrl?: boolean
    createdAt?: boolean
    form?: boolean | FormDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["formVersion"]>



  export type FormVersionSelectScalar = {
    id?: boolean
    formId?: boolean
    versionNumber?: boolean
    data?: boolean
    pdfUrl?: boolean
    createdAt?: boolean
  }

  export type FormVersionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "formId" | "versionNumber" | "data" | "pdfUrl" | "createdAt", ExtArgs["result"]["formVersion"]>
  export type FormVersionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    form?: boolean | FormDefaultArgs<ExtArgs>
  }

  export type $FormVersionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "FormVersion"
    objects: {
      form: Prisma.$FormPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      formId: number
      versionNumber: number
      data: string
      pdfUrl: string | null
      createdAt: Date
    }, ExtArgs["result"]["formVersion"]>
    composites: {}
  }

  type FormVersionGetPayload<S extends boolean | null | undefined | FormVersionDefaultArgs> = $Result.GetResult<Prisma.$FormVersionPayload, S>

  type FormVersionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<FormVersionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: FormVersionCountAggregateInputType | true
    }

  export interface FormVersionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['FormVersion'], meta: { name: 'FormVersion' } }
    /**
     * Find zero or one FormVersion that matches the filter.
     * @param {FormVersionFindUniqueArgs} args - Arguments to find a FormVersion
     * @example
     * // Get one FormVersion
     * const formVersion = await prisma.formVersion.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends FormVersionFindUniqueArgs>(args: SelectSubset<T, FormVersionFindUniqueArgs<ExtArgs>>): Prisma__FormVersionClient<$Result.GetResult<Prisma.$FormVersionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one FormVersion that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {FormVersionFindUniqueOrThrowArgs} args - Arguments to find a FormVersion
     * @example
     * // Get one FormVersion
     * const formVersion = await prisma.formVersion.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends FormVersionFindUniqueOrThrowArgs>(args: SelectSubset<T, FormVersionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__FormVersionClient<$Result.GetResult<Prisma.$FormVersionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first FormVersion that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FormVersionFindFirstArgs} args - Arguments to find a FormVersion
     * @example
     * // Get one FormVersion
     * const formVersion = await prisma.formVersion.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends FormVersionFindFirstArgs>(args?: SelectSubset<T, FormVersionFindFirstArgs<ExtArgs>>): Prisma__FormVersionClient<$Result.GetResult<Prisma.$FormVersionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first FormVersion that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FormVersionFindFirstOrThrowArgs} args - Arguments to find a FormVersion
     * @example
     * // Get one FormVersion
     * const formVersion = await prisma.formVersion.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends FormVersionFindFirstOrThrowArgs>(args?: SelectSubset<T, FormVersionFindFirstOrThrowArgs<ExtArgs>>): Prisma__FormVersionClient<$Result.GetResult<Prisma.$FormVersionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more FormVersions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FormVersionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all FormVersions
     * const formVersions = await prisma.formVersion.findMany()
     * 
     * // Get first 10 FormVersions
     * const formVersions = await prisma.formVersion.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const formVersionWithIdOnly = await prisma.formVersion.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends FormVersionFindManyArgs>(args?: SelectSubset<T, FormVersionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FormVersionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a FormVersion.
     * @param {FormVersionCreateArgs} args - Arguments to create a FormVersion.
     * @example
     * // Create one FormVersion
     * const FormVersion = await prisma.formVersion.create({
     *   data: {
     *     // ... data to create a FormVersion
     *   }
     * })
     * 
     */
    create<T extends FormVersionCreateArgs>(args: SelectSubset<T, FormVersionCreateArgs<ExtArgs>>): Prisma__FormVersionClient<$Result.GetResult<Prisma.$FormVersionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many FormVersions.
     * @param {FormVersionCreateManyArgs} args - Arguments to create many FormVersions.
     * @example
     * // Create many FormVersions
     * const formVersion = await prisma.formVersion.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends FormVersionCreateManyArgs>(args?: SelectSubset<T, FormVersionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a FormVersion.
     * @param {FormVersionDeleteArgs} args - Arguments to delete one FormVersion.
     * @example
     * // Delete one FormVersion
     * const FormVersion = await prisma.formVersion.delete({
     *   where: {
     *     // ... filter to delete one FormVersion
     *   }
     * })
     * 
     */
    delete<T extends FormVersionDeleteArgs>(args: SelectSubset<T, FormVersionDeleteArgs<ExtArgs>>): Prisma__FormVersionClient<$Result.GetResult<Prisma.$FormVersionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one FormVersion.
     * @param {FormVersionUpdateArgs} args - Arguments to update one FormVersion.
     * @example
     * // Update one FormVersion
     * const formVersion = await prisma.formVersion.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends FormVersionUpdateArgs>(args: SelectSubset<T, FormVersionUpdateArgs<ExtArgs>>): Prisma__FormVersionClient<$Result.GetResult<Prisma.$FormVersionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more FormVersions.
     * @param {FormVersionDeleteManyArgs} args - Arguments to filter FormVersions to delete.
     * @example
     * // Delete a few FormVersions
     * const { count } = await prisma.formVersion.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends FormVersionDeleteManyArgs>(args?: SelectSubset<T, FormVersionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more FormVersions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FormVersionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many FormVersions
     * const formVersion = await prisma.formVersion.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends FormVersionUpdateManyArgs>(args: SelectSubset<T, FormVersionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one FormVersion.
     * @param {FormVersionUpsertArgs} args - Arguments to update or create a FormVersion.
     * @example
     * // Update or create a FormVersion
     * const formVersion = await prisma.formVersion.upsert({
     *   create: {
     *     // ... data to create a FormVersion
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the FormVersion we want to update
     *   }
     * })
     */
    upsert<T extends FormVersionUpsertArgs>(args: SelectSubset<T, FormVersionUpsertArgs<ExtArgs>>): Prisma__FormVersionClient<$Result.GetResult<Prisma.$FormVersionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of FormVersions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FormVersionCountArgs} args - Arguments to filter FormVersions to count.
     * @example
     * // Count the number of FormVersions
     * const count = await prisma.formVersion.count({
     *   where: {
     *     // ... the filter for the FormVersions we want to count
     *   }
     * })
    **/
    count<T extends FormVersionCountArgs>(
      args?: Subset<T, FormVersionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], FormVersionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a FormVersion.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FormVersionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends FormVersionAggregateArgs>(args: Subset<T, FormVersionAggregateArgs>): Prisma.PrismaPromise<GetFormVersionAggregateType<T>>

    /**
     * Group by FormVersion.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FormVersionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends FormVersionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: FormVersionGroupByArgs['orderBy'] }
        : { orderBy?: FormVersionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, FormVersionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetFormVersionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the FormVersion model
   */
  readonly fields: FormVersionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for FormVersion.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__FormVersionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    form<T extends FormDefaultArgs<ExtArgs> = {}>(args?: Subset<T, FormDefaultArgs<ExtArgs>>): Prisma__FormClient<$Result.GetResult<Prisma.$FormPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the FormVersion model
   */
  interface FormVersionFieldRefs {
    readonly id: FieldRef<"FormVersion", 'Int'>
    readonly formId: FieldRef<"FormVersion", 'Int'>
    readonly versionNumber: FieldRef<"FormVersion", 'Int'>
    readonly data: FieldRef<"FormVersion", 'String'>
    readonly pdfUrl: FieldRef<"FormVersion", 'String'>
    readonly createdAt: FieldRef<"FormVersion", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * FormVersion findUnique
   */
  export type FormVersionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FormVersion
     */
    select?: FormVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FormVersion
     */
    omit?: FormVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormVersionInclude<ExtArgs> | null
    /**
     * Filter, which FormVersion to fetch.
     */
    where: FormVersionWhereUniqueInput
  }

  /**
   * FormVersion findUniqueOrThrow
   */
  export type FormVersionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FormVersion
     */
    select?: FormVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FormVersion
     */
    omit?: FormVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormVersionInclude<ExtArgs> | null
    /**
     * Filter, which FormVersion to fetch.
     */
    where: FormVersionWhereUniqueInput
  }

  /**
   * FormVersion findFirst
   */
  export type FormVersionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FormVersion
     */
    select?: FormVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FormVersion
     */
    omit?: FormVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormVersionInclude<ExtArgs> | null
    /**
     * Filter, which FormVersion to fetch.
     */
    where?: FormVersionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FormVersions to fetch.
     */
    orderBy?: FormVersionOrderByWithRelationInput | FormVersionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for FormVersions.
     */
    cursor?: FormVersionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FormVersions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FormVersions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of FormVersions.
     */
    distinct?: FormVersionScalarFieldEnum | FormVersionScalarFieldEnum[]
  }

  /**
   * FormVersion findFirstOrThrow
   */
  export type FormVersionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FormVersion
     */
    select?: FormVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FormVersion
     */
    omit?: FormVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormVersionInclude<ExtArgs> | null
    /**
     * Filter, which FormVersion to fetch.
     */
    where?: FormVersionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FormVersions to fetch.
     */
    orderBy?: FormVersionOrderByWithRelationInput | FormVersionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for FormVersions.
     */
    cursor?: FormVersionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FormVersions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FormVersions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of FormVersions.
     */
    distinct?: FormVersionScalarFieldEnum | FormVersionScalarFieldEnum[]
  }

  /**
   * FormVersion findMany
   */
  export type FormVersionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FormVersion
     */
    select?: FormVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FormVersion
     */
    omit?: FormVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormVersionInclude<ExtArgs> | null
    /**
     * Filter, which FormVersions to fetch.
     */
    where?: FormVersionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FormVersions to fetch.
     */
    orderBy?: FormVersionOrderByWithRelationInput | FormVersionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing FormVersions.
     */
    cursor?: FormVersionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FormVersions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FormVersions.
     */
    skip?: number
    distinct?: FormVersionScalarFieldEnum | FormVersionScalarFieldEnum[]
  }

  /**
   * FormVersion create
   */
  export type FormVersionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FormVersion
     */
    select?: FormVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FormVersion
     */
    omit?: FormVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormVersionInclude<ExtArgs> | null
    /**
     * The data needed to create a FormVersion.
     */
    data: XOR<FormVersionCreateInput, FormVersionUncheckedCreateInput>
  }

  /**
   * FormVersion createMany
   */
  export type FormVersionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many FormVersions.
     */
    data: FormVersionCreateManyInput | FormVersionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * FormVersion update
   */
  export type FormVersionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FormVersion
     */
    select?: FormVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FormVersion
     */
    omit?: FormVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormVersionInclude<ExtArgs> | null
    /**
     * The data needed to update a FormVersion.
     */
    data: XOR<FormVersionUpdateInput, FormVersionUncheckedUpdateInput>
    /**
     * Choose, which FormVersion to update.
     */
    where: FormVersionWhereUniqueInput
  }

  /**
   * FormVersion updateMany
   */
  export type FormVersionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update FormVersions.
     */
    data: XOR<FormVersionUpdateManyMutationInput, FormVersionUncheckedUpdateManyInput>
    /**
     * Filter which FormVersions to update
     */
    where?: FormVersionWhereInput
    /**
     * Limit how many FormVersions to update.
     */
    limit?: number
  }

  /**
   * FormVersion upsert
   */
  export type FormVersionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FormVersion
     */
    select?: FormVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FormVersion
     */
    omit?: FormVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormVersionInclude<ExtArgs> | null
    /**
     * The filter to search for the FormVersion to update in case it exists.
     */
    where: FormVersionWhereUniqueInput
    /**
     * In case the FormVersion found by the `where` argument doesn't exist, create a new FormVersion with this data.
     */
    create: XOR<FormVersionCreateInput, FormVersionUncheckedCreateInput>
    /**
     * In case the FormVersion was found with the provided `where` argument, update it with this data.
     */
    update: XOR<FormVersionUpdateInput, FormVersionUncheckedUpdateInput>
  }

  /**
   * FormVersion delete
   */
  export type FormVersionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FormVersion
     */
    select?: FormVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FormVersion
     */
    omit?: FormVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormVersionInclude<ExtArgs> | null
    /**
     * Filter which FormVersion to delete.
     */
    where: FormVersionWhereUniqueInput
  }

  /**
   * FormVersion deleteMany
   */
  export type FormVersionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which FormVersions to delete
     */
    where?: FormVersionWhereInput
    /**
     * Limit how many FormVersions to delete.
     */
    limit?: number
  }

  /**
   * FormVersion without action
   */
  export type FormVersionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FormVersion
     */
    select?: FormVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FormVersion
     */
    omit?: FormVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormVersionInclude<ExtArgs> | null
  }


  /**
   * Model FormAttachment
   */

  export type AggregateFormAttachment = {
    _count: FormAttachmentCountAggregateOutputType | null
    _avg: FormAttachmentAvgAggregateOutputType | null
    _sum: FormAttachmentSumAggregateOutputType | null
    _min: FormAttachmentMinAggregateOutputType | null
    _max: FormAttachmentMaxAggregateOutputType | null
  }

  export type FormAttachmentAvgAggregateOutputType = {
    id: number | null
    formId: number | null
  }

  export type FormAttachmentSumAggregateOutputType = {
    id: number | null
    formId: number | null
  }

  export type FormAttachmentMinAggregateOutputType = {
    id: number | null
    formId: number | null
    fileName: string | null
    fileUrl: string | null
    mimeType: string | null
    createdAt: Date | null
  }

  export type FormAttachmentMaxAggregateOutputType = {
    id: number | null
    formId: number | null
    fileName: string | null
    fileUrl: string | null
    mimeType: string | null
    createdAt: Date | null
  }

  export type FormAttachmentCountAggregateOutputType = {
    id: number
    formId: number
    fileName: number
    fileUrl: number
    mimeType: number
    createdAt: number
    _all: number
  }


  export type FormAttachmentAvgAggregateInputType = {
    id?: true
    formId?: true
  }

  export type FormAttachmentSumAggregateInputType = {
    id?: true
    formId?: true
  }

  export type FormAttachmentMinAggregateInputType = {
    id?: true
    formId?: true
    fileName?: true
    fileUrl?: true
    mimeType?: true
    createdAt?: true
  }

  export type FormAttachmentMaxAggregateInputType = {
    id?: true
    formId?: true
    fileName?: true
    fileUrl?: true
    mimeType?: true
    createdAt?: true
  }

  export type FormAttachmentCountAggregateInputType = {
    id?: true
    formId?: true
    fileName?: true
    fileUrl?: true
    mimeType?: true
    createdAt?: true
    _all?: true
  }

  export type FormAttachmentAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which FormAttachment to aggregate.
     */
    where?: FormAttachmentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FormAttachments to fetch.
     */
    orderBy?: FormAttachmentOrderByWithRelationInput | FormAttachmentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: FormAttachmentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FormAttachments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FormAttachments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned FormAttachments
    **/
    _count?: true | FormAttachmentCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: FormAttachmentAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: FormAttachmentSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: FormAttachmentMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: FormAttachmentMaxAggregateInputType
  }

  export type GetFormAttachmentAggregateType<T extends FormAttachmentAggregateArgs> = {
        [P in keyof T & keyof AggregateFormAttachment]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateFormAttachment[P]>
      : GetScalarType<T[P], AggregateFormAttachment[P]>
  }




  export type FormAttachmentGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FormAttachmentWhereInput
    orderBy?: FormAttachmentOrderByWithAggregationInput | FormAttachmentOrderByWithAggregationInput[]
    by: FormAttachmentScalarFieldEnum[] | FormAttachmentScalarFieldEnum
    having?: FormAttachmentScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: FormAttachmentCountAggregateInputType | true
    _avg?: FormAttachmentAvgAggregateInputType
    _sum?: FormAttachmentSumAggregateInputType
    _min?: FormAttachmentMinAggregateInputType
    _max?: FormAttachmentMaxAggregateInputType
  }

  export type FormAttachmentGroupByOutputType = {
    id: number
    formId: number
    fileName: string
    fileUrl: string
    mimeType: string | null
    createdAt: Date
    _count: FormAttachmentCountAggregateOutputType | null
    _avg: FormAttachmentAvgAggregateOutputType | null
    _sum: FormAttachmentSumAggregateOutputType | null
    _min: FormAttachmentMinAggregateOutputType | null
    _max: FormAttachmentMaxAggregateOutputType | null
  }

  type GetFormAttachmentGroupByPayload<T extends FormAttachmentGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<FormAttachmentGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof FormAttachmentGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], FormAttachmentGroupByOutputType[P]>
            : GetScalarType<T[P], FormAttachmentGroupByOutputType[P]>
        }
      >
    >


  export type FormAttachmentSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    formId?: boolean
    fileName?: boolean
    fileUrl?: boolean
    mimeType?: boolean
    createdAt?: boolean
    form?: boolean | FormDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["formAttachment"]>



  export type FormAttachmentSelectScalar = {
    id?: boolean
    formId?: boolean
    fileName?: boolean
    fileUrl?: boolean
    mimeType?: boolean
    createdAt?: boolean
  }

  export type FormAttachmentOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "formId" | "fileName" | "fileUrl" | "mimeType" | "createdAt", ExtArgs["result"]["formAttachment"]>
  export type FormAttachmentInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    form?: boolean | FormDefaultArgs<ExtArgs>
  }

  export type $FormAttachmentPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "FormAttachment"
    objects: {
      form: Prisma.$FormPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      formId: number
      fileName: string
      fileUrl: string
      mimeType: string | null
      createdAt: Date
    }, ExtArgs["result"]["formAttachment"]>
    composites: {}
  }

  type FormAttachmentGetPayload<S extends boolean | null | undefined | FormAttachmentDefaultArgs> = $Result.GetResult<Prisma.$FormAttachmentPayload, S>

  type FormAttachmentCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<FormAttachmentFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: FormAttachmentCountAggregateInputType | true
    }

  export interface FormAttachmentDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['FormAttachment'], meta: { name: 'FormAttachment' } }
    /**
     * Find zero or one FormAttachment that matches the filter.
     * @param {FormAttachmentFindUniqueArgs} args - Arguments to find a FormAttachment
     * @example
     * // Get one FormAttachment
     * const formAttachment = await prisma.formAttachment.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends FormAttachmentFindUniqueArgs>(args: SelectSubset<T, FormAttachmentFindUniqueArgs<ExtArgs>>): Prisma__FormAttachmentClient<$Result.GetResult<Prisma.$FormAttachmentPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one FormAttachment that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {FormAttachmentFindUniqueOrThrowArgs} args - Arguments to find a FormAttachment
     * @example
     * // Get one FormAttachment
     * const formAttachment = await prisma.formAttachment.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends FormAttachmentFindUniqueOrThrowArgs>(args: SelectSubset<T, FormAttachmentFindUniqueOrThrowArgs<ExtArgs>>): Prisma__FormAttachmentClient<$Result.GetResult<Prisma.$FormAttachmentPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first FormAttachment that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FormAttachmentFindFirstArgs} args - Arguments to find a FormAttachment
     * @example
     * // Get one FormAttachment
     * const formAttachment = await prisma.formAttachment.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends FormAttachmentFindFirstArgs>(args?: SelectSubset<T, FormAttachmentFindFirstArgs<ExtArgs>>): Prisma__FormAttachmentClient<$Result.GetResult<Prisma.$FormAttachmentPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first FormAttachment that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FormAttachmentFindFirstOrThrowArgs} args - Arguments to find a FormAttachment
     * @example
     * // Get one FormAttachment
     * const formAttachment = await prisma.formAttachment.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends FormAttachmentFindFirstOrThrowArgs>(args?: SelectSubset<T, FormAttachmentFindFirstOrThrowArgs<ExtArgs>>): Prisma__FormAttachmentClient<$Result.GetResult<Prisma.$FormAttachmentPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more FormAttachments that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FormAttachmentFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all FormAttachments
     * const formAttachments = await prisma.formAttachment.findMany()
     * 
     * // Get first 10 FormAttachments
     * const formAttachments = await prisma.formAttachment.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const formAttachmentWithIdOnly = await prisma.formAttachment.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends FormAttachmentFindManyArgs>(args?: SelectSubset<T, FormAttachmentFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FormAttachmentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a FormAttachment.
     * @param {FormAttachmentCreateArgs} args - Arguments to create a FormAttachment.
     * @example
     * // Create one FormAttachment
     * const FormAttachment = await prisma.formAttachment.create({
     *   data: {
     *     // ... data to create a FormAttachment
     *   }
     * })
     * 
     */
    create<T extends FormAttachmentCreateArgs>(args: SelectSubset<T, FormAttachmentCreateArgs<ExtArgs>>): Prisma__FormAttachmentClient<$Result.GetResult<Prisma.$FormAttachmentPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many FormAttachments.
     * @param {FormAttachmentCreateManyArgs} args - Arguments to create many FormAttachments.
     * @example
     * // Create many FormAttachments
     * const formAttachment = await prisma.formAttachment.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends FormAttachmentCreateManyArgs>(args?: SelectSubset<T, FormAttachmentCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a FormAttachment.
     * @param {FormAttachmentDeleteArgs} args - Arguments to delete one FormAttachment.
     * @example
     * // Delete one FormAttachment
     * const FormAttachment = await prisma.formAttachment.delete({
     *   where: {
     *     // ... filter to delete one FormAttachment
     *   }
     * })
     * 
     */
    delete<T extends FormAttachmentDeleteArgs>(args: SelectSubset<T, FormAttachmentDeleteArgs<ExtArgs>>): Prisma__FormAttachmentClient<$Result.GetResult<Prisma.$FormAttachmentPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one FormAttachment.
     * @param {FormAttachmentUpdateArgs} args - Arguments to update one FormAttachment.
     * @example
     * // Update one FormAttachment
     * const formAttachment = await prisma.formAttachment.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends FormAttachmentUpdateArgs>(args: SelectSubset<T, FormAttachmentUpdateArgs<ExtArgs>>): Prisma__FormAttachmentClient<$Result.GetResult<Prisma.$FormAttachmentPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more FormAttachments.
     * @param {FormAttachmentDeleteManyArgs} args - Arguments to filter FormAttachments to delete.
     * @example
     * // Delete a few FormAttachments
     * const { count } = await prisma.formAttachment.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends FormAttachmentDeleteManyArgs>(args?: SelectSubset<T, FormAttachmentDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more FormAttachments.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FormAttachmentUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many FormAttachments
     * const formAttachment = await prisma.formAttachment.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends FormAttachmentUpdateManyArgs>(args: SelectSubset<T, FormAttachmentUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one FormAttachment.
     * @param {FormAttachmentUpsertArgs} args - Arguments to update or create a FormAttachment.
     * @example
     * // Update or create a FormAttachment
     * const formAttachment = await prisma.formAttachment.upsert({
     *   create: {
     *     // ... data to create a FormAttachment
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the FormAttachment we want to update
     *   }
     * })
     */
    upsert<T extends FormAttachmentUpsertArgs>(args: SelectSubset<T, FormAttachmentUpsertArgs<ExtArgs>>): Prisma__FormAttachmentClient<$Result.GetResult<Prisma.$FormAttachmentPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of FormAttachments.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FormAttachmentCountArgs} args - Arguments to filter FormAttachments to count.
     * @example
     * // Count the number of FormAttachments
     * const count = await prisma.formAttachment.count({
     *   where: {
     *     // ... the filter for the FormAttachments we want to count
     *   }
     * })
    **/
    count<T extends FormAttachmentCountArgs>(
      args?: Subset<T, FormAttachmentCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], FormAttachmentCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a FormAttachment.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FormAttachmentAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends FormAttachmentAggregateArgs>(args: Subset<T, FormAttachmentAggregateArgs>): Prisma.PrismaPromise<GetFormAttachmentAggregateType<T>>

    /**
     * Group by FormAttachment.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FormAttachmentGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends FormAttachmentGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: FormAttachmentGroupByArgs['orderBy'] }
        : { orderBy?: FormAttachmentGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, FormAttachmentGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetFormAttachmentGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the FormAttachment model
   */
  readonly fields: FormAttachmentFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for FormAttachment.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__FormAttachmentClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    form<T extends FormDefaultArgs<ExtArgs> = {}>(args?: Subset<T, FormDefaultArgs<ExtArgs>>): Prisma__FormClient<$Result.GetResult<Prisma.$FormPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the FormAttachment model
   */
  interface FormAttachmentFieldRefs {
    readonly id: FieldRef<"FormAttachment", 'Int'>
    readonly formId: FieldRef<"FormAttachment", 'Int'>
    readonly fileName: FieldRef<"FormAttachment", 'String'>
    readonly fileUrl: FieldRef<"FormAttachment", 'String'>
    readonly mimeType: FieldRef<"FormAttachment", 'String'>
    readonly createdAt: FieldRef<"FormAttachment", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * FormAttachment findUnique
   */
  export type FormAttachmentFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FormAttachment
     */
    select?: FormAttachmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FormAttachment
     */
    omit?: FormAttachmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormAttachmentInclude<ExtArgs> | null
    /**
     * Filter, which FormAttachment to fetch.
     */
    where: FormAttachmentWhereUniqueInput
  }

  /**
   * FormAttachment findUniqueOrThrow
   */
  export type FormAttachmentFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FormAttachment
     */
    select?: FormAttachmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FormAttachment
     */
    omit?: FormAttachmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormAttachmentInclude<ExtArgs> | null
    /**
     * Filter, which FormAttachment to fetch.
     */
    where: FormAttachmentWhereUniqueInput
  }

  /**
   * FormAttachment findFirst
   */
  export type FormAttachmentFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FormAttachment
     */
    select?: FormAttachmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FormAttachment
     */
    omit?: FormAttachmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormAttachmentInclude<ExtArgs> | null
    /**
     * Filter, which FormAttachment to fetch.
     */
    where?: FormAttachmentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FormAttachments to fetch.
     */
    orderBy?: FormAttachmentOrderByWithRelationInput | FormAttachmentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for FormAttachments.
     */
    cursor?: FormAttachmentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FormAttachments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FormAttachments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of FormAttachments.
     */
    distinct?: FormAttachmentScalarFieldEnum | FormAttachmentScalarFieldEnum[]
  }

  /**
   * FormAttachment findFirstOrThrow
   */
  export type FormAttachmentFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FormAttachment
     */
    select?: FormAttachmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FormAttachment
     */
    omit?: FormAttachmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormAttachmentInclude<ExtArgs> | null
    /**
     * Filter, which FormAttachment to fetch.
     */
    where?: FormAttachmentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FormAttachments to fetch.
     */
    orderBy?: FormAttachmentOrderByWithRelationInput | FormAttachmentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for FormAttachments.
     */
    cursor?: FormAttachmentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FormAttachments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FormAttachments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of FormAttachments.
     */
    distinct?: FormAttachmentScalarFieldEnum | FormAttachmentScalarFieldEnum[]
  }

  /**
   * FormAttachment findMany
   */
  export type FormAttachmentFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FormAttachment
     */
    select?: FormAttachmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FormAttachment
     */
    omit?: FormAttachmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormAttachmentInclude<ExtArgs> | null
    /**
     * Filter, which FormAttachments to fetch.
     */
    where?: FormAttachmentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FormAttachments to fetch.
     */
    orderBy?: FormAttachmentOrderByWithRelationInput | FormAttachmentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing FormAttachments.
     */
    cursor?: FormAttachmentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FormAttachments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FormAttachments.
     */
    skip?: number
    distinct?: FormAttachmentScalarFieldEnum | FormAttachmentScalarFieldEnum[]
  }

  /**
   * FormAttachment create
   */
  export type FormAttachmentCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FormAttachment
     */
    select?: FormAttachmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FormAttachment
     */
    omit?: FormAttachmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormAttachmentInclude<ExtArgs> | null
    /**
     * The data needed to create a FormAttachment.
     */
    data: XOR<FormAttachmentCreateInput, FormAttachmentUncheckedCreateInput>
  }

  /**
   * FormAttachment createMany
   */
  export type FormAttachmentCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many FormAttachments.
     */
    data: FormAttachmentCreateManyInput | FormAttachmentCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * FormAttachment update
   */
  export type FormAttachmentUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FormAttachment
     */
    select?: FormAttachmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FormAttachment
     */
    omit?: FormAttachmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormAttachmentInclude<ExtArgs> | null
    /**
     * The data needed to update a FormAttachment.
     */
    data: XOR<FormAttachmentUpdateInput, FormAttachmentUncheckedUpdateInput>
    /**
     * Choose, which FormAttachment to update.
     */
    where: FormAttachmentWhereUniqueInput
  }

  /**
   * FormAttachment updateMany
   */
  export type FormAttachmentUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update FormAttachments.
     */
    data: XOR<FormAttachmentUpdateManyMutationInput, FormAttachmentUncheckedUpdateManyInput>
    /**
     * Filter which FormAttachments to update
     */
    where?: FormAttachmentWhereInput
    /**
     * Limit how many FormAttachments to update.
     */
    limit?: number
  }

  /**
   * FormAttachment upsert
   */
  export type FormAttachmentUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FormAttachment
     */
    select?: FormAttachmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FormAttachment
     */
    omit?: FormAttachmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormAttachmentInclude<ExtArgs> | null
    /**
     * The filter to search for the FormAttachment to update in case it exists.
     */
    where: FormAttachmentWhereUniqueInput
    /**
     * In case the FormAttachment found by the `where` argument doesn't exist, create a new FormAttachment with this data.
     */
    create: XOR<FormAttachmentCreateInput, FormAttachmentUncheckedCreateInput>
    /**
     * In case the FormAttachment was found with the provided `where` argument, update it with this data.
     */
    update: XOR<FormAttachmentUpdateInput, FormAttachmentUncheckedUpdateInput>
  }

  /**
   * FormAttachment delete
   */
  export type FormAttachmentDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FormAttachment
     */
    select?: FormAttachmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FormAttachment
     */
    omit?: FormAttachmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormAttachmentInclude<ExtArgs> | null
    /**
     * Filter which FormAttachment to delete.
     */
    where: FormAttachmentWhereUniqueInput
  }

  /**
   * FormAttachment deleteMany
   */
  export type FormAttachmentDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which FormAttachments to delete
     */
    where?: FormAttachmentWhereInput
    /**
     * Limit how many FormAttachments to delete.
     */
    limit?: number
  }

  /**
   * FormAttachment without action
   */
  export type FormAttachmentDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FormAttachment
     */
    select?: FormAttachmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FormAttachment
     */
    omit?: FormAttachmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FormAttachmentInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    id: 'id',
    googleId: 'googleId',
    email: 'email',
    password: 'password',
    firstName: 'firstName',
    lastName: 'lastName',
    phone: 'phone',
    address: 'address',
    role: 'role',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    jmbg: 'jmbg',
    passwordResetToken: 'passwordResetToken',
    passwordResetTokenExpiry: 'passwordResetTokenExpiry',
    emailVerificationExpiry: 'emailVerificationExpiry',
    emailVerificationToken: 'emailVerificationToken',
    isEmailVerified: 'isEmailVerified',
    idCardNumber: 'idCardNumber'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const SubscriptionScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    startDate: 'startDate',
    endDate: 'endDate',
    isActive: 'isActive',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type SubscriptionScalarFieldEnum = (typeof SubscriptionScalarFieldEnum)[keyof typeof SubscriptionScalarFieldEnum]


  export const OrganizationScalarFieldEnum: {
    id: 'id',
    name: 'name',
    taxNumber: 'taxNumber',
    email: 'email',
    phone: 'phone',
    address: 'address',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    createdById: 'createdById',
    type: 'type',
    activityCode: 'activityCode',
    activityName: 'activityName',
    isClientOrg: 'isClientOrg'
  };

  export type OrganizationScalarFieldEnum = (typeof OrganizationScalarFieldEnum)[keyof typeof OrganizationScalarFieldEnum]


  export const WorkerScalarFieldEnum: {
    id: 'id',
    organizationId: 'organizationId',
    firstName: 'firstName',
    lastName: 'lastName',
    jmbg: 'jmbg',
    startDate: 'startDate',
    endDate: 'endDate',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    address: 'address',
    email: 'email',
    phone: 'phone',
    role: 'role',
    idCardNumber: 'idCardNumber'
  };

  export type WorkerScalarFieldEnum = (typeof WorkerScalarFieldEnum)[keyof typeof WorkerScalarFieldEnum]


  export const OrganizationMemberScalarFieldEnum: {
    id: 'id',
    organizationId: 'organizationId',
    userId: 'userId',
    role: 'role',
    joinedAt: 'joinedAt'
  };

  export type OrganizationMemberScalarFieldEnum = (typeof OrganizationMemberScalarFieldEnum)[keyof typeof OrganizationMemberScalarFieldEnum]


  export const ClientScalarFieldEnum: {
    id: 'id',
    organizationId: 'organizationId',
    type: 'type',
    firstName: 'firstName',
    lastName: 'lastName',
    companyName: 'companyName',
    email: 'email',
    phone: 'phone',
    address: 'address',
    jmbg: 'jmbg',
    taxNumber: 'taxNumber',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    createdById: 'createdById',
    amortizacijaOnly: 'amortizacijaOnly',
    idCardNumber: 'idCardNumber'
  };

  export type ClientScalarFieldEnum = (typeof ClientScalarFieldEnum)[keyof typeof ClientScalarFieldEnum]


  export const FormScalarFieldEnum: {
    id: 'id',
    type: 'type',
    status: 'status',
    year: 'year',
    month: 'month',
    title: 'title',
    organizationId: 'organizationId',
    clientId: 'clientId',
    createdById: 'createdById',
    updatedById: 'updatedById',
    pdfUrl: 'pdfUrl',
    notes: 'notes',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type FormScalarFieldEnum = (typeof FormScalarFieldEnum)[keyof typeof FormScalarFieldEnum]


  export const FormVersionScalarFieldEnum: {
    id: 'id',
    formId: 'formId',
    versionNumber: 'versionNumber',
    data: 'data',
    pdfUrl: 'pdfUrl',
    createdAt: 'createdAt'
  };

  export type FormVersionScalarFieldEnum = (typeof FormVersionScalarFieldEnum)[keyof typeof FormVersionScalarFieldEnum]


  export const FormAttachmentScalarFieldEnum: {
    id: 'id',
    formId: 'formId',
    fileName: 'fileName',
    fileUrl: 'fileUrl',
    mimeType: 'mimeType',
    createdAt: 'createdAt'
  };

  export type FormAttachmentScalarFieldEnum = (typeof FormAttachmentScalarFieldEnum)[keyof typeof FormAttachmentScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const UserOrderByRelevanceFieldEnum: {
    googleId: 'googleId',
    email: 'email',
    password: 'password',
    firstName: 'firstName',
    lastName: 'lastName',
    phone: 'phone',
    address: 'address',
    jmbg: 'jmbg',
    passwordResetToken: 'passwordResetToken',
    emailVerificationToken: 'emailVerificationToken',
    idCardNumber: 'idCardNumber'
  };

  export type UserOrderByRelevanceFieldEnum = (typeof UserOrderByRelevanceFieldEnum)[keyof typeof UserOrderByRelevanceFieldEnum]


  export const OrganizationOrderByRelevanceFieldEnum: {
    name: 'name',
    taxNumber: 'taxNumber',
    email: 'email',
    phone: 'phone',
    address: 'address',
    activityCode: 'activityCode',
    activityName: 'activityName'
  };

  export type OrganizationOrderByRelevanceFieldEnum = (typeof OrganizationOrderByRelevanceFieldEnum)[keyof typeof OrganizationOrderByRelevanceFieldEnum]


  export const WorkerOrderByRelevanceFieldEnum: {
    firstName: 'firstName',
    lastName: 'lastName',
    jmbg: 'jmbg',
    address: 'address',
    email: 'email',
    phone: 'phone',
    idCardNumber: 'idCardNumber'
  };

  export type WorkerOrderByRelevanceFieldEnum = (typeof WorkerOrderByRelevanceFieldEnum)[keyof typeof WorkerOrderByRelevanceFieldEnum]


  export const ClientOrderByRelevanceFieldEnum: {
    firstName: 'firstName',
    lastName: 'lastName',
    companyName: 'companyName',
    email: 'email',
    phone: 'phone',
    address: 'address',
    jmbg: 'jmbg',
    taxNumber: 'taxNumber',
    idCardNumber: 'idCardNumber'
  };

  export type ClientOrderByRelevanceFieldEnum = (typeof ClientOrderByRelevanceFieldEnum)[keyof typeof ClientOrderByRelevanceFieldEnum]


  export const FormOrderByRelevanceFieldEnum: {
    title: 'title',
    pdfUrl: 'pdfUrl',
    notes: 'notes'
  };

  export type FormOrderByRelevanceFieldEnum = (typeof FormOrderByRelevanceFieldEnum)[keyof typeof FormOrderByRelevanceFieldEnum]


  export const FormVersionOrderByRelevanceFieldEnum: {
    data: 'data',
    pdfUrl: 'pdfUrl'
  };

  export type FormVersionOrderByRelevanceFieldEnum = (typeof FormVersionOrderByRelevanceFieldEnum)[keyof typeof FormVersionOrderByRelevanceFieldEnum]


  export const FormAttachmentOrderByRelevanceFieldEnum: {
    fileName: 'fileName',
    fileUrl: 'fileUrl',
    mimeType: 'mimeType'
  };

  export type FormAttachmentOrderByRelevanceFieldEnum = (typeof FormAttachmentOrderByRelevanceFieldEnum)[keyof typeof FormAttachmentOrderByRelevanceFieldEnum]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'users_role'
   */
  export type Enumusers_roleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'users_role'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'OrganizationType'
   */
  export type EnumOrganizationTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'OrganizationType'>
    


  /**
   * Reference to a field of type 'WorkerRole'
   */
  export type EnumWorkerRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'WorkerRole'>
    


  /**
   * Reference to a field of type 'OrganizationRole'
   */
  export type EnumOrganizationRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'OrganizationRole'>
    


  /**
   * Reference to a field of type 'ClientType'
   */
  export type EnumClientTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ClientType'>
    


  /**
   * Reference to a field of type 'forms_type'
   */
  export type Enumforms_typeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'forms_type'>
    


  /**
   * Reference to a field of type 'FormStatus'
   */
  export type EnumFormStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'FormStatus'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: IntFilter<"User"> | number
    googleId?: StringNullableFilter<"User"> | string | null
    email?: StringNullableFilter<"User"> | string | null
    password?: StringNullableFilter<"User"> | string | null
    firstName?: StringFilter<"User"> | string
    lastName?: StringFilter<"User"> | string
    phone?: StringNullableFilter<"User"> | string | null
    address?: StringNullableFilter<"User"> | string | null
    role?: Enumusers_roleFilter<"User"> | $Enums.users_role
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    jmbg?: StringNullableFilter<"User"> | string | null
    passwordResetToken?: StringNullableFilter<"User"> | string | null
    passwordResetTokenExpiry?: DateTimeNullableFilter<"User"> | Date | string | null
    emailVerificationExpiry?: DateTimeNullableFilter<"User"> | Date | string | null
    emailVerificationToken?: StringNullableFilter<"User"> | string | null
    isEmailVerified?: BoolFilter<"User"> | boolean
    idCardNumber?: StringNullableFilter<"User"> | string | null
    createdClients?: ClientListRelationFilter
    createdForms?: FormListRelationFilter
    updatedForms?: FormListRelationFilter
    organizations?: OrganizationMemberListRelationFilter
    createdOrganizations?: OrganizationListRelationFilter
    subscription?: XOR<SubscriptionNullableScalarRelationFilter, SubscriptionWhereInput> | null
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    googleId?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    password?: SortOrderInput | SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    phone?: SortOrderInput | SortOrder
    address?: SortOrderInput | SortOrder
    role?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    jmbg?: SortOrderInput | SortOrder
    passwordResetToken?: SortOrderInput | SortOrder
    passwordResetTokenExpiry?: SortOrderInput | SortOrder
    emailVerificationExpiry?: SortOrderInput | SortOrder
    emailVerificationToken?: SortOrderInput | SortOrder
    isEmailVerified?: SortOrder
    idCardNumber?: SortOrderInput | SortOrder
    createdClients?: ClientOrderByRelationAggregateInput
    createdForms?: FormOrderByRelationAggregateInput
    updatedForms?: FormOrderByRelationAggregateInput
    organizations?: OrganizationMemberOrderByRelationAggregateInput
    createdOrganizations?: OrganizationOrderByRelationAggregateInput
    subscription?: SubscriptionOrderByWithRelationInput
    _relevance?: UserOrderByRelevanceInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    googleId?: string
    email?: string
    jmbg?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    password?: StringNullableFilter<"User"> | string | null
    firstName?: StringFilter<"User"> | string
    lastName?: StringFilter<"User"> | string
    phone?: StringNullableFilter<"User"> | string | null
    address?: StringNullableFilter<"User"> | string | null
    role?: Enumusers_roleFilter<"User"> | $Enums.users_role
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    passwordResetToken?: StringNullableFilter<"User"> | string | null
    passwordResetTokenExpiry?: DateTimeNullableFilter<"User"> | Date | string | null
    emailVerificationExpiry?: DateTimeNullableFilter<"User"> | Date | string | null
    emailVerificationToken?: StringNullableFilter<"User"> | string | null
    isEmailVerified?: BoolFilter<"User"> | boolean
    idCardNumber?: StringNullableFilter<"User"> | string | null
    createdClients?: ClientListRelationFilter
    createdForms?: FormListRelationFilter
    updatedForms?: FormListRelationFilter
    organizations?: OrganizationMemberListRelationFilter
    createdOrganizations?: OrganizationListRelationFilter
    subscription?: XOR<SubscriptionNullableScalarRelationFilter, SubscriptionWhereInput> | null
  }, "id" | "googleId" | "email" | "jmbg">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    googleId?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    password?: SortOrderInput | SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    phone?: SortOrderInput | SortOrder
    address?: SortOrderInput | SortOrder
    role?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    jmbg?: SortOrderInput | SortOrder
    passwordResetToken?: SortOrderInput | SortOrder
    passwordResetTokenExpiry?: SortOrderInput | SortOrder
    emailVerificationExpiry?: SortOrderInput | SortOrder
    emailVerificationToken?: SortOrderInput | SortOrder
    isEmailVerified?: SortOrder
    idCardNumber?: SortOrderInput | SortOrder
    _count?: UserCountOrderByAggregateInput
    _avg?: UserAvgOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
    _sum?: UserSumOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"User"> | number
    googleId?: StringNullableWithAggregatesFilter<"User"> | string | null
    email?: StringNullableWithAggregatesFilter<"User"> | string | null
    password?: StringNullableWithAggregatesFilter<"User"> | string | null
    firstName?: StringWithAggregatesFilter<"User"> | string
    lastName?: StringWithAggregatesFilter<"User"> | string
    phone?: StringNullableWithAggregatesFilter<"User"> | string | null
    address?: StringNullableWithAggregatesFilter<"User"> | string | null
    role?: Enumusers_roleWithAggregatesFilter<"User"> | $Enums.users_role
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    jmbg?: StringNullableWithAggregatesFilter<"User"> | string | null
    passwordResetToken?: StringNullableWithAggregatesFilter<"User"> | string | null
    passwordResetTokenExpiry?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    emailVerificationExpiry?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    emailVerificationToken?: StringNullableWithAggregatesFilter<"User"> | string | null
    isEmailVerified?: BoolWithAggregatesFilter<"User"> | boolean
    idCardNumber?: StringNullableWithAggregatesFilter<"User"> | string | null
  }

  export type SubscriptionWhereInput = {
    AND?: SubscriptionWhereInput | SubscriptionWhereInput[]
    OR?: SubscriptionWhereInput[]
    NOT?: SubscriptionWhereInput | SubscriptionWhereInput[]
    id?: IntFilter<"Subscription"> | number
    userId?: IntFilter<"Subscription"> | number
    startDate?: DateTimeFilter<"Subscription"> | Date | string
    endDate?: DateTimeFilter<"Subscription"> | Date | string
    isActive?: BoolFilter<"Subscription"> | boolean
    createdAt?: DateTimeFilter<"Subscription"> | Date | string
    updatedAt?: DateTimeFilter<"Subscription"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type SubscriptionOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type SubscriptionWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    userId?: number
    AND?: SubscriptionWhereInput | SubscriptionWhereInput[]
    OR?: SubscriptionWhereInput[]
    NOT?: SubscriptionWhereInput | SubscriptionWhereInput[]
    startDate?: DateTimeFilter<"Subscription"> | Date | string
    endDate?: DateTimeFilter<"Subscription"> | Date | string
    isActive?: BoolFilter<"Subscription"> | boolean
    createdAt?: DateTimeFilter<"Subscription"> | Date | string
    updatedAt?: DateTimeFilter<"Subscription"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id" | "userId">

  export type SubscriptionOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: SubscriptionCountOrderByAggregateInput
    _avg?: SubscriptionAvgOrderByAggregateInput
    _max?: SubscriptionMaxOrderByAggregateInput
    _min?: SubscriptionMinOrderByAggregateInput
    _sum?: SubscriptionSumOrderByAggregateInput
  }

  export type SubscriptionScalarWhereWithAggregatesInput = {
    AND?: SubscriptionScalarWhereWithAggregatesInput | SubscriptionScalarWhereWithAggregatesInput[]
    OR?: SubscriptionScalarWhereWithAggregatesInput[]
    NOT?: SubscriptionScalarWhereWithAggregatesInput | SubscriptionScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Subscription"> | number
    userId?: IntWithAggregatesFilter<"Subscription"> | number
    startDate?: DateTimeWithAggregatesFilter<"Subscription"> | Date | string
    endDate?: DateTimeWithAggregatesFilter<"Subscription"> | Date | string
    isActive?: BoolWithAggregatesFilter<"Subscription"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"Subscription"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Subscription"> | Date | string
  }

  export type OrganizationWhereInput = {
    AND?: OrganizationWhereInput | OrganizationWhereInput[]
    OR?: OrganizationWhereInput[]
    NOT?: OrganizationWhereInput | OrganizationWhereInput[]
    id?: IntFilter<"Organization"> | number
    name?: StringFilter<"Organization"> | string
    taxNumber?: StringNullableFilter<"Organization"> | string | null
    email?: StringNullableFilter<"Organization"> | string | null
    phone?: StringNullableFilter<"Organization"> | string | null
    address?: StringNullableFilter<"Organization"> | string | null
    createdAt?: DateTimeFilter<"Organization"> | Date | string
    updatedAt?: DateTimeFilter<"Organization"> | Date | string
    createdById?: IntFilter<"Organization"> | number
    type?: EnumOrganizationTypeFilter<"Organization"> | $Enums.OrganizationType
    activityCode?: StringNullableFilter<"Organization"> | string | null
    activityName?: StringNullableFilter<"Organization"> | string | null
    isClientOrg?: BoolFilter<"Organization"> | boolean
    clients?: ClientListRelationFilter
    forms?: FormListRelationFilter
    members?: OrganizationMemberListRelationFilter
    createdBy?: XOR<UserScalarRelationFilter, UserWhereInput>
    workers?: WorkerListRelationFilter
  }

  export type OrganizationOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    taxNumber?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    phone?: SortOrderInput | SortOrder
    address?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    createdById?: SortOrder
    type?: SortOrder
    activityCode?: SortOrderInput | SortOrder
    activityName?: SortOrderInput | SortOrder
    isClientOrg?: SortOrder
    clients?: ClientOrderByRelationAggregateInput
    forms?: FormOrderByRelationAggregateInput
    members?: OrganizationMemberOrderByRelationAggregateInput
    createdBy?: UserOrderByWithRelationInput
    workers?: WorkerOrderByRelationAggregateInput
    _relevance?: OrganizationOrderByRelevanceInput
  }

  export type OrganizationWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    taxNumber?: string
    AND?: OrganizationWhereInput | OrganizationWhereInput[]
    OR?: OrganizationWhereInput[]
    NOT?: OrganizationWhereInput | OrganizationWhereInput[]
    name?: StringFilter<"Organization"> | string
    email?: StringNullableFilter<"Organization"> | string | null
    phone?: StringNullableFilter<"Organization"> | string | null
    address?: StringNullableFilter<"Organization"> | string | null
    createdAt?: DateTimeFilter<"Organization"> | Date | string
    updatedAt?: DateTimeFilter<"Organization"> | Date | string
    createdById?: IntFilter<"Organization"> | number
    type?: EnumOrganizationTypeFilter<"Organization"> | $Enums.OrganizationType
    activityCode?: StringNullableFilter<"Organization"> | string | null
    activityName?: StringNullableFilter<"Organization"> | string | null
    isClientOrg?: BoolFilter<"Organization"> | boolean
    clients?: ClientListRelationFilter
    forms?: FormListRelationFilter
    members?: OrganizationMemberListRelationFilter
    createdBy?: XOR<UserScalarRelationFilter, UserWhereInput>
    workers?: WorkerListRelationFilter
  }, "id" | "taxNumber">

  export type OrganizationOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    taxNumber?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    phone?: SortOrderInput | SortOrder
    address?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    createdById?: SortOrder
    type?: SortOrder
    activityCode?: SortOrderInput | SortOrder
    activityName?: SortOrderInput | SortOrder
    isClientOrg?: SortOrder
    _count?: OrganizationCountOrderByAggregateInput
    _avg?: OrganizationAvgOrderByAggregateInput
    _max?: OrganizationMaxOrderByAggregateInput
    _min?: OrganizationMinOrderByAggregateInput
    _sum?: OrganizationSumOrderByAggregateInput
  }

  export type OrganizationScalarWhereWithAggregatesInput = {
    AND?: OrganizationScalarWhereWithAggregatesInput | OrganizationScalarWhereWithAggregatesInput[]
    OR?: OrganizationScalarWhereWithAggregatesInput[]
    NOT?: OrganizationScalarWhereWithAggregatesInput | OrganizationScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Organization"> | number
    name?: StringWithAggregatesFilter<"Organization"> | string
    taxNumber?: StringNullableWithAggregatesFilter<"Organization"> | string | null
    email?: StringNullableWithAggregatesFilter<"Organization"> | string | null
    phone?: StringNullableWithAggregatesFilter<"Organization"> | string | null
    address?: StringNullableWithAggregatesFilter<"Organization"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Organization"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Organization"> | Date | string
    createdById?: IntWithAggregatesFilter<"Organization"> | number
    type?: EnumOrganizationTypeWithAggregatesFilter<"Organization"> | $Enums.OrganizationType
    activityCode?: StringNullableWithAggregatesFilter<"Organization"> | string | null
    activityName?: StringNullableWithAggregatesFilter<"Organization"> | string | null
    isClientOrg?: BoolWithAggregatesFilter<"Organization"> | boolean
  }

  export type WorkerWhereInput = {
    AND?: WorkerWhereInput | WorkerWhereInput[]
    OR?: WorkerWhereInput[]
    NOT?: WorkerWhereInput | WorkerWhereInput[]
    id?: IntFilter<"Worker"> | number
    organizationId?: IntFilter<"Worker"> | number
    firstName?: StringFilter<"Worker"> | string
    lastName?: StringFilter<"Worker"> | string
    jmbg?: StringNullableFilter<"Worker"> | string | null
    startDate?: DateTimeNullableFilter<"Worker"> | Date | string | null
    endDate?: DateTimeNullableFilter<"Worker"> | Date | string | null
    createdAt?: DateTimeFilter<"Worker"> | Date | string
    updatedAt?: DateTimeFilter<"Worker"> | Date | string
    address?: StringNullableFilter<"Worker"> | string | null
    email?: StringNullableFilter<"Worker"> | string | null
    phone?: StringNullableFilter<"Worker"> | string | null
    role?: EnumWorkerRoleFilter<"Worker"> | $Enums.WorkerRole
    idCardNumber?: StringNullableFilter<"Worker"> | string | null
    organization?: XOR<OrganizationScalarRelationFilter, OrganizationWhereInput>
  }

  export type WorkerOrderByWithRelationInput = {
    id?: SortOrder
    organizationId?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    jmbg?: SortOrderInput | SortOrder
    startDate?: SortOrderInput | SortOrder
    endDate?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    address?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    phone?: SortOrderInput | SortOrder
    role?: SortOrder
    idCardNumber?: SortOrderInput | SortOrder
    organization?: OrganizationOrderByWithRelationInput
    _relevance?: WorkerOrderByRelevanceInput
  }

  export type WorkerWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: WorkerWhereInput | WorkerWhereInput[]
    OR?: WorkerWhereInput[]
    NOT?: WorkerWhereInput | WorkerWhereInput[]
    organizationId?: IntFilter<"Worker"> | number
    firstName?: StringFilter<"Worker"> | string
    lastName?: StringFilter<"Worker"> | string
    jmbg?: StringNullableFilter<"Worker"> | string | null
    startDate?: DateTimeNullableFilter<"Worker"> | Date | string | null
    endDate?: DateTimeNullableFilter<"Worker"> | Date | string | null
    createdAt?: DateTimeFilter<"Worker"> | Date | string
    updatedAt?: DateTimeFilter<"Worker"> | Date | string
    address?: StringNullableFilter<"Worker"> | string | null
    email?: StringNullableFilter<"Worker"> | string | null
    phone?: StringNullableFilter<"Worker"> | string | null
    role?: EnumWorkerRoleFilter<"Worker"> | $Enums.WorkerRole
    idCardNumber?: StringNullableFilter<"Worker"> | string | null
    organization?: XOR<OrganizationScalarRelationFilter, OrganizationWhereInput>
  }, "id">

  export type WorkerOrderByWithAggregationInput = {
    id?: SortOrder
    organizationId?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    jmbg?: SortOrderInput | SortOrder
    startDate?: SortOrderInput | SortOrder
    endDate?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    address?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    phone?: SortOrderInput | SortOrder
    role?: SortOrder
    idCardNumber?: SortOrderInput | SortOrder
    _count?: WorkerCountOrderByAggregateInput
    _avg?: WorkerAvgOrderByAggregateInput
    _max?: WorkerMaxOrderByAggregateInput
    _min?: WorkerMinOrderByAggregateInput
    _sum?: WorkerSumOrderByAggregateInput
  }

  export type WorkerScalarWhereWithAggregatesInput = {
    AND?: WorkerScalarWhereWithAggregatesInput | WorkerScalarWhereWithAggregatesInput[]
    OR?: WorkerScalarWhereWithAggregatesInput[]
    NOT?: WorkerScalarWhereWithAggregatesInput | WorkerScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Worker"> | number
    organizationId?: IntWithAggregatesFilter<"Worker"> | number
    firstName?: StringWithAggregatesFilter<"Worker"> | string
    lastName?: StringWithAggregatesFilter<"Worker"> | string
    jmbg?: StringNullableWithAggregatesFilter<"Worker"> | string | null
    startDate?: DateTimeNullableWithAggregatesFilter<"Worker"> | Date | string | null
    endDate?: DateTimeNullableWithAggregatesFilter<"Worker"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Worker"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Worker"> | Date | string
    address?: StringNullableWithAggregatesFilter<"Worker"> | string | null
    email?: StringNullableWithAggregatesFilter<"Worker"> | string | null
    phone?: StringNullableWithAggregatesFilter<"Worker"> | string | null
    role?: EnumWorkerRoleWithAggregatesFilter<"Worker"> | $Enums.WorkerRole
    idCardNumber?: StringNullableWithAggregatesFilter<"Worker"> | string | null
  }

  export type OrganizationMemberWhereInput = {
    AND?: OrganizationMemberWhereInput | OrganizationMemberWhereInput[]
    OR?: OrganizationMemberWhereInput[]
    NOT?: OrganizationMemberWhereInput | OrganizationMemberWhereInput[]
    id?: IntFilter<"OrganizationMember"> | number
    organizationId?: IntFilter<"OrganizationMember"> | number
    userId?: IntFilter<"OrganizationMember"> | number
    role?: EnumOrganizationRoleFilter<"OrganizationMember"> | $Enums.OrganizationRole
    joinedAt?: DateTimeFilter<"OrganizationMember"> | Date | string
    organization?: XOR<OrganizationScalarRelationFilter, OrganizationWhereInput>
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type OrganizationMemberOrderByWithRelationInput = {
    id?: SortOrder
    organizationId?: SortOrder
    userId?: SortOrder
    role?: SortOrder
    joinedAt?: SortOrder
    organization?: OrganizationOrderByWithRelationInput
    user?: UserOrderByWithRelationInput
  }

  export type OrganizationMemberWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    organizationId_userId?: OrganizationMemberOrganizationIdUserIdCompoundUniqueInput
    AND?: OrganizationMemberWhereInput | OrganizationMemberWhereInput[]
    OR?: OrganizationMemberWhereInput[]
    NOT?: OrganizationMemberWhereInput | OrganizationMemberWhereInput[]
    organizationId?: IntFilter<"OrganizationMember"> | number
    userId?: IntFilter<"OrganizationMember"> | number
    role?: EnumOrganizationRoleFilter<"OrganizationMember"> | $Enums.OrganizationRole
    joinedAt?: DateTimeFilter<"OrganizationMember"> | Date | string
    organization?: XOR<OrganizationScalarRelationFilter, OrganizationWhereInput>
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id" | "organizationId_userId">

  export type OrganizationMemberOrderByWithAggregationInput = {
    id?: SortOrder
    organizationId?: SortOrder
    userId?: SortOrder
    role?: SortOrder
    joinedAt?: SortOrder
    _count?: OrganizationMemberCountOrderByAggregateInput
    _avg?: OrganizationMemberAvgOrderByAggregateInput
    _max?: OrganizationMemberMaxOrderByAggregateInput
    _min?: OrganizationMemberMinOrderByAggregateInput
    _sum?: OrganizationMemberSumOrderByAggregateInput
  }

  export type OrganizationMemberScalarWhereWithAggregatesInput = {
    AND?: OrganizationMemberScalarWhereWithAggregatesInput | OrganizationMemberScalarWhereWithAggregatesInput[]
    OR?: OrganizationMemberScalarWhereWithAggregatesInput[]
    NOT?: OrganizationMemberScalarWhereWithAggregatesInput | OrganizationMemberScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"OrganizationMember"> | number
    organizationId?: IntWithAggregatesFilter<"OrganizationMember"> | number
    userId?: IntWithAggregatesFilter<"OrganizationMember"> | number
    role?: EnumOrganizationRoleWithAggregatesFilter<"OrganizationMember"> | $Enums.OrganizationRole
    joinedAt?: DateTimeWithAggregatesFilter<"OrganizationMember"> | Date | string
  }

  export type ClientWhereInput = {
    AND?: ClientWhereInput | ClientWhereInput[]
    OR?: ClientWhereInput[]
    NOT?: ClientWhereInput | ClientWhereInput[]
    id?: IntFilter<"Client"> | number
    organizationId?: IntNullableFilter<"Client"> | number | null
    type?: EnumClientTypeFilter<"Client"> | $Enums.ClientType
    firstName?: StringNullableFilter<"Client"> | string | null
    lastName?: StringNullableFilter<"Client"> | string | null
    companyName?: StringNullableFilter<"Client"> | string | null
    email?: StringNullableFilter<"Client"> | string | null
    phone?: StringNullableFilter<"Client"> | string | null
    address?: StringNullableFilter<"Client"> | string | null
    jmbg?: StringNullableFilter<"Client"> | string | null
    taxNumber?: StringNullableFilter<"Client"> | string | null
    createdAt?: DateTimeFilter<"Client"> | Date | string
    updatedAt?: DateTimeFilter<"Client"> | Date | string
    createdById?: IntNullableFilter<"Client"> | number | null
    amortizacijaOnly?: BoolFilter<"Client"> | boolean
    idCardNumber?: StringNullableFilter<"Client"> | string | null
    createdBy?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    organization?: XOR<OrganizationNullableScalarRelationFilter, OrganizationWhereInput> | null
    forms?: FormListRelationFilter
  }

  export type ClientOrderByWithRelationInput = {
    id?: SortOrder
    organizationId?: SortOrderInput | SortOrder
    type?: SortOrder
    firstName?: SortOrderInput | SortOrder
    lastName?: SortOrderInput | SortOrder
    companyName?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    phone?: SortOrderInput | SortOrder
    address?: SortOrderInput | SortOrder
    jmbg?: SortOrderInput | SortOrder
    taxNumber?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    createdById?: SortOrderInput | SortOrder
    amortizacijaOnly?: SortOrder
    idCardNumber?: SortOrderInput | SortOrder
    createdBy?: UserOrderByWithRelationInput
    organization?: OrganizationOrderByWithRelationInput
    forms?: FormOrderByRelationAggregateInput
    _relevance?: ClientOrderByRelevanceInput
  }

  export type ClientWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: ClientWhereInput | ClientWhereInput[]
    OR?: ClientWhereInput[]
    NOT?: ClientWhereInput | ClientWhereInput[]
    organizationId?: IntNullableFilter<"Client"> | number | null
    type?: EnumClientTypeFilter<"Client"> | $Enums.ClientType
    firstName?: StringNullableFilter<"Client"> | string | null
    lastName?: StringNullableFilter<"Client"> | string | null
    companyName?: StringNullableFilter<"Client"> | string | null
    email?: StringNullableFilter<"Client"> | string | null
    phone?: StringNullableFilter<"Client"> | string | null
    address?: StringNullableFilter<"Client"> | string | null
    jmbg?: StringNullableFilter<"Client"> | string | null
    taxNumber?: StringNullableFilter<"Client"> | string | null
    createdAt?: DateTimeFilter<"Client"> | Date | string
    updatedAt?: DateTimeFilter<"Client"> | Date | string
    createdById?: IntNullableFilter<"Client"> | number | null
    amortizacijaOnly?: BoolFilter<"Client"> | boolean
    idCardNumber?: StringNullableFilter<"Client"> | string | null
    createdBy?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    organization?: XOR<OrganizationNullableScalarRelationFilter, OrganizationWhereInput> | null
    forms?: FormListRelationFilter
  }, "id">

  export type ClientOrderByWithAggregationInput = {
    id?: SortOrder
    organizationId?: SortOrderInput | SortOrder
    type?: SortOrder
    firstName?: SortOrderInput | SortOrder
    lastName?: SortOrderInput | SortOrder
    companyName?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    phone?: SortOrderInput | SortOrder
    address?: SortOrderInput | SortOrder
    jmbg?: SortOrderInput | SortOrder
    taxNumber?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    createdById?: SortOrderInput | SortOrder
    amortizacijaOnly?: SortOrder
    idCardNumber?: SortOrderInput | SortOrder
    _count?: ClientCountOrderByAggregateInput
    _avg?: ClientAvgOrderByAggregateInput
    _max?: ClientMaxOrderByAggregateInput
    _min?: ClientMinOrderByAggregateInput
    _sum?: ClientSumOrderByAggregateInput
  }

  export type ClientScalarWhereWithAggregatesInput = {
    AND?: ClientScalarWhereWithAggregatesInput | ClientScalarWhereWithAggregatesInput[]
    OR?: ClientScalarWhereWithAggregatesInput[]
    NOT?: ClientScalarWhereWithAggregatesInput | ClientScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Client"> | number
    organizationId?: IntNullableWithAggregatesFilter<"Client"> | number | null
    type?: EnumClientTypeWithAggregatesFilter<"Client"> | $Enums.ClientType
    firstName?: StringNullableWithAggregatesFilter<"Client"> | string | null
    lastName?: StringNullableWithAggregatesFilter<"Client"> | string | null
    companyName?: StringNullableWithAggregatesFilter<"Client"> | string | null
    email?: StringNullableWithAggregatesFilter<"Client"> | string | null
    phone?: StringNullableWithAggregatesFilter<"Client"> | string | null
    address?: StringNullableWithAggregatesFilter<"Client"> | string | null
    jmbg?: StringNullableWithAggregatesFilter<"Client"> | string | null
    taxNumber?: StringNullableWithAggregatesFilter<"Client"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Client"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Client"> | Date | string
    createdById?: IntNullableWithAggregatesFilter<"Client"> | number | null
    amortizacijaOnly?: BoolWithAggregatesFilter<"Client"> | boolean
    idCardNumber?: StringNullableWithAggregatesFilter<"Client"> | string | null
  }

  export type FormWhereInput = {
    AND?: FormWhereInput | FormWhereInput[]
    OR?: FormWhereInput[]
    NOT?: FormWhereInput | FormWhereInput[]
    id?: IntFilter<"Form"> | number
    type?: Enumforms_typeFilter<"Form"> | $Enums.forms_type
    status?: EnumFormStatusFilter<"Form"> | $Enums.FormStatus
    year?: IntFilter<"Form"> | number
    month?: IntNullableFilter<"Form"> | number | null
    title?: StringNullableFilter<"Form"> | string | null
    organizationId?: IntNullableFilter<"Form"> | number | null
    clientId?: IntNullableFilter<"Form"> | number | null
    createdById?: IntFilter<"Form"> | number
    updatedById?: IntNullableFilter<"Form"> | number | null
    pdfUrl?: StringNullableFilter<"Form"> | string | null
    notes?: StringNullableFilter<"Form"> | string | null
    createdAt?: DateTimeFilter<"Form"> | Date | string
    updatedAt?: DateTimeFilter<"Form"> | Date | string
    attachments?: FormAttachmentListRelationFilter
    versions?: FormVersionListRelationFilter
    client?: XOR<ClientNullableScalarRelationFilter, ClientWhereInput> | null
    createdBy?: XOR<UserScalarRelationFilter, UserWhereInput>
    organization?: XOR<OrganizationNullableScalarRelationFilter, OrganizationWhereInput> | null
    updatedBy?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }

  export type FormOrderByWithRelationInput = {
    id?: SortOrder
    type?: SortOrder
    status?: SortOrder
    year?: SortOrder
    month?: SortOrderInput | SortOrder
    title?: SortOrderInput | SortOrder
    organizationId?: SortOrderInput | SortOrder
    clientId?: SortOrderInput | SortOrder
    createdById?: SortOrder
    updatedById?: SortOrderInput | SortOrder
    pdfUrl?: SortOrderInput | SortOrder
    notes?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    attachments?: FormAttachmentOrderByRelationAggregateInput
    versions?: FormVersionOrderByRelationAggregateInput
    client?: ClientOrderByWithRelationInput
    createdBy?: UserOrderByWithRelationInput
    organization?: OrganizationOrderByWithRelationInput
    updatedBy?: UserOrderByWithRelationInput
    _relevance?: FormOrderByRelevanceInput
  }

  export type FormWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: FormWhereInput | FormWhereInput[]
    OR?: FormWhereInput[]
    NOT?: FormWhereInput | FormWhereInput[]
    type?: Enumforms_typeFilter<"Form"> | $Enums.forms_type
    status?: EnumFormStatusFilter<"Form"> | $Enums.FormStatus
    year?: IntFilter<"Form"> | number
    month?: IntNullableFilter<"Form"> | number | null
    title?: StringNullableFilter<"Form"> | string | null
    organizationId?: IntNullableFilter<"Form"> | number | null
    clientId?: IntNullableFilter<"Form"> | number | null
    createdById?: IntFilter<"Form"> | number
    updatedById?: IntNullableFilter<"Form"> | number | null
    pdfUrl?: StringNullableFilter<"Form"> | string | null
    notes?: StringNullableFilter<"Form"> | string | null
    createdAt?: DateTimeFilter<"Form"> | Date | string
    updatedAt?: DateTimeFilter<"Form"> | Date | string
    attachments?: FormAttachmentListRelationFilter
    versions?: FormVersionListRelationFilter
    client?: XOR<ClientNullableScalarRelationFilter, ClientWhereInput> | null
    createdBy?: XOR<UserScalarRelationFilter, UserWhereInput>
    organization?: XOR<OrganizationNullableScalarRelationFilter, OrganizationWhereInput> | null
    updatedBy?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }, "id">

  export type FormOrderByWithAggregationInput = {
    id?: SortOrder
    type?: SortOrder
    status?: SortOrder
    year?: SortOrder
    month?: SortOrderInput | SortOrder
    title?: SortOrderInput | SortOrder
    organizationId?: SortOrderInput | SortOrder
    clientId?: SortOrderInput | SortOrder
    createdById?: SortOrder
    updatedById?: SortOrderInput | SortOrder
    pdfUrl?: SortOrderInput | SortOrder
    notes?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: FormCountOrderByAggregateInput
    _avg?: FormAvgOrderByAggregateInput
    _max?: FormMaxOrderByAggregateInput
    _min?: FormMinOrderByAggregateInput
    _sum?: FormSumOrderByAggregateInput
  }

  export type FormScalarWhereWithAggregatesInput = {
    AND?: FormScalarWhereWithAggregatesInput | FormScalarWhereWithAggregatesInput[]
    OR?: FormScalarWhereWithAggregatesInput[]
    NOT?: FormScalarWhereWithAggregatesInput | FormScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Form"> | number
    type?: Enumforms_typeWithAggregatesFilter<"Form"> | $Enums.forms_type
    status?: EnumFormStatusWithAggregatesFilter<"Form"> | $Enums.FormStatus
    year?: IntWithAggregatesFilter<"Form"> | number
    month?: IntNullableWithAggregatesFilter<"Form"> | number | null
    title?: StringNullableWithAggregatesFilter<"Form"> | string | null
    organizationId?: IntNullableWithAggregatesFilter<"Form"> | number | null
    clientId?: IntNullableWithAggregatesFilter<"Form"> | number | null
    createdById?: IntWithAggregatesFilter<"Form"> | number
    updatedById?: IntNullableWithAggregatesFilter<"Form"> | number | null
    pdfUrl?: StringNullableWithAggregatesFilter<"Form"> | string | null
    notes?: StringNullableWithAggregatesFilter<"Form"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Form"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Form"> | Date | string
  }

  export type FormVersionWhereInput = {
    AND?: FormVersionWhereInput | FormVersionWhereInput[]
    OR?: FormVersionWhereInput[]
    NOT?: FormVersionWhereInput | FormVersionWhereInput[]
    id?: IntFilter<"FormVersion"> | number
    formId?: IntFilter<"FormVersion"> | number
    versionNumber?: IntFilter<"FormVersion"> | number
    data?: StringFilter<"FormVersion"> | string
    pdfUrl?: StringNullableFilter<"FormVersion"> | string | null
    createdAt?: DateTimeFilter<"FormVersion"> | Date | string
    form?: XOR<FormScalarRelationFilter, FormWhereInput>
  }

  export type FormVersionOrderByWithRelationInput = {
    id?: SortOrder
    formId?: SortOrder
    versionNumber?: SortOrder
    data?: SortOrder
    pdfUrl?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    form?: FormOrderByWithRelationInput
    _relevance?: FormVersionOrderByRelevanceInput
  }

  export type FormVersionWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    formId_versionNumber?: FormVersionFormIdVersionNumberCompoundUniqueInput
    AND?: FormVersionWhereInput | FormVersionWhereInput[]
    OR?: FormVersionWhereInput[]
    NOT?: FormVersionWhereInput | FormVersionWhereInput[]
    formId?: IntFilter<"FormVersion"> | number
    versionNumber?: IntFilter<"FormVersion"> | number
    data?: StringFilter<"FormVersion"> | string
    pdfUrl?: StringNullableFilter<"FormVersion"> | string | null
    createdAt?: DateTimeFilter<"FormVersion"> | Date | string
    form?: XOR<FormScalarRelationFilter, FormWhereInput>
  }, "id" | "formId_versionNumber">

  export type FormVersionOrderByWithAggregationInput = {
    id?: SortOrder
    formId?: SortOrder
    versionNumber?: SortOrder
    data?: SortOrder
    pdfUrl?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: FormVersionCountOrderByAggregateInput
    _avg?: FormVersionAvgOrderByAggregateInput
    _max?: FormVersionMaxOrderByAggregateInput
    _min?: FormVersionMinOrderByAggregateInput
    _sum?: FormVersionSumOrderByAggregateInput
  }

  export type FormVersionScalarWhereWithAggregatesInput = {
    AND?: FormVersionScalarWhereWithAggregatesInput | FormVersionScalarWhereWithAggregatesInput[]
    OR?: FormVersionScalarWhereWithAggregatesInput[]
    NOT?: FormVersionScalarWhereWithAggregatesInput | FormVersionScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"FormVersion"> | number
    formId?: IntWithAggregatesFilter<"FormVersion"> | number
    versionNumber?: IntWithAggregatesFilter<"FormVersion"> | number
    data?: StringWithAggregatesFilter<"FormVersion"> | string
    pdfUrl?: StringNullableWithAggregatesFilter<"FormVersion"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"FormVersion"> | Date | string
  }

  export type FormAttachmentWhereInput = {
    AND?: FormAttachmentWhereInput | FormAttachmentWhereInput[]
    OR?: FormAttachmentWhereInput[]
    NOT?: FormAttachmentWhereInput | FormAttachmentWhereInput[]
    id?: IntFilter<"FormAttachment"> | number
    formId?: IntFilter<"FormAttachment"> | number
    fileName?: StringFilter<"FormAttachment"> | string
    fileUrl?: StringFilter<"FormAttachment"> | string
    mimeType?: StringNullableFilter<"FormAttachment"> | string | null
    createdAt?: DateTimeFilter<"FormAttachment"> | Date | string
    form?: XOR<FormScalarRelationFilter, FormWhereInput>
  }

  export type FormAttachmentOrderByWithRelationInput = {
    id?: SortOrder
    formId?: SortOrder
    fileName?: SortOrder
    fileUrl?: SortOrder
    mimeType?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    form?: FormOrderByWithRelationInput
    _relevance?: FormAttachmentOrderByRelevanceInput
  }

  export type FormAttachmentWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: FormAttachmentWhereInput | FormAttachmentWhereInput[]
    OR?: FormAttachmentWhereInput[]
    NOT?: FormAttachmentWhereInput | FormAttachmentWhereInput[]
    formId?: IntFilter<"FormAttachment"> | number
    fileName?: StringFilter<"FormAttachment"> | string
    fileUrl?: StringFilter<"FormAttachment"> | string
    mimeType?: StringNullableFilter<"FormAttachment"> | string | null
    createdAt?: DateTimeFilter<"FormAttachment"> | Date | string
    form?: XOR<FormScalarRelationFilter, FormWhereInput>
  }, "id">

  export type FormAttachmentOrderByWithAggregationInput = {
    id?: SortOrder
    formId?: SortOrder
    fileName?: SortOrder
    fileUrl?: SortOrder
    mimeType?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: FormAttachmentCountOrderByAggregateInput
    _avg?: FormAttachmentAvgOrderByAggregateInput
    _max?: FormAttachmentMaxOrderByAggregateInput
    _min?: FormAttachmentMinOrderByAggregateInput
    _sum?: FormAttachmentSumOrderByAggregateInput
  }

  export type FormAttachmentScalarWhereWithAggregatesInput = {
    AND?: FormAttachmentScalarWhereWithAggregatesInput | FormAttachmentScalarWhereWithAggregatesInput[]
    OR?: FormAttachmentScalarWhereWithAggregatesInput[]
    NOT?: FormAttachmentScalarWhereWithAggregatesInput | FormAttachmentScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"FormAttachment"> | number
    formId?: IntWithAggregatesFilter<"FormAttachment"> | number
    fileName?: StringWithAggregatesFilter<"FormAttachment"> | string
    fileUrl?: StringWithAggregatesFilter<"FormAttachment"> | string
    mimeType?: StringNullableWithAggregatesFilter<"FormAttachment"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"FormAttachment"> | Date | string
  }

  export type UserCreateInput = {
    googleId?: string | null
    email?: string | null
    password?: string | null
    firstName: string
    lastName: string
    phone?: string | null
    address?: string | null
    role?: $Enums.users_role
    createdAt?: Date | string
    updatedAt?: Date | string
    jmbg?: string | null
    passwordResetToken?: string | null
    passwordResetTokenExpiry?: Date | string | null
    emailVerificationExpiry?: Date | string | null
    emailVerificationToken?: string | null
    isEmailVerified?: boolean
    idCardNumber?: string | null
    createdClients?: ClientCreateNestedManyWithoutCreatedByInput
    createdForms?: FormCreateNestedManyWithoutCreatedByInput
    updatedForms?: FormCreateNestedManyWithoutUpdatedByInput
    organizations?: OrganizationMemberCreateNestedManyWithoutUserInput
    createdOrganizations?: OrganizationCreateNestedManyWithoutCreatedByInput
    subscription?: SubscriptionCreateNestedOneWithoutUserInput
  }

  export type UserUncheckedCreateInput = {
    id?: number
    googleId?: string | null
    email?: string | null
    password?: string | null
    firstName: string
    lastName: string
    phone?: string | null
    address?: string | null
    role?: $Enums.users_role
    createdAt?: Date | string
    updatedAt?: Date | string
    jmbg?: string | null
    passwordResetToken?: string | null
    passwordResetTokenExpiry?: Date | string | null
    emailVerificationExpiry?: Date | string | null
    emailVerificationToken?: string | null
    isEmailVerified?: boolean
    idCardNumber?: string | null
    createdClients?: ClientUncheckedCreateNestedManyWithoutCreatedByInput
    createdForms?: FormUncheckedCreateNestedManyWithoutCreatedByInput
    updatedForms?: FormUncheckedCreateNestedManyWithoutUpdatedByInput
    organizations?: OrganizationMemberUncheckedCreateNestedManyWithoutUserInput
    createdOrganizations?: OrganizationUncheckedCreateNestedManyWithoutCreatedByInput
    subscription?: SubscriptionUncheckedCreateNestedOneWithoutUserInput
  }

  export type UserUpdateInput = {
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    role?: Enumusers_roleFieldUpdateOperationsInput | $Enums.users_role
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetToken?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetTokenExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdClients?: ClientUpdateManyWithoutCreatedByNestedInput
    createdForms?: FormUpdateManyWithoutCreatedByNestedInput
    updatedForms?: FormUpdateManyWithoutUpdatedByNestedInput
    organizations?: OrganizationMemberUpdateManyWithoutUserNestedInput
    createdOrganizations?: OrganizationUpdateManyWithoutCreatedByNestedInput
    subscription?: SubscriptionUpdateOneWithoutUserNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    role?: Enumusers_roleFieldUpdateOperationsInput | $Enums.users_role
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetToken?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetTokenExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdClients?: ClientUncheckedUpdateManyWithoutCreatedByNestedInput
    createdForms?: FormUncheckedUpdateManyWithoutCreatedByNestedInput
    updatedForms?: FormUncheckedUpdateManyWithoutUpdatedByNestedInput
    organizations?: OrganizationMemberUncheckedUpdateManyWithoutUserNestedInput
    createdOrganizations?: OrganizationUncheckedUpdateManyWithoutCreatedByNestedInput
    subscription?: SubscriptionUncheckedUpdateOneWithoutUserNestedInput
  }

  export type UserCreateManyInput = {
    id?: number
    googleId?: string | null
    email?: string | null
    password?: string | null
    firstName: string
    lastName: string
    phone?: string | null
    address?: string | null
    role?: $Enums.users_role
    createdAt?: Date | string
    updatedAt?: Date | string
    jmbg?: string | null
    passwordResetToken?: string | null
    passwordResetTokenExpiry?: Date | string | null
    emailVerificationExpiry?: Date | string | null
    emailVerificationToken?: string | null
    isEmailVerified?: boolean
    idCardNumber?: string | null
  }

  export type UserUpdateManyMutationInput = {
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    role?: Enumusers_roleFieldUpdateOperationsInput | $Enums.users_role
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetToken?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetTokenExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type UserUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    role?: Enumusers_roleFieldUpdateOperationsInput | $Enums.users_role
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetToken?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetTokenExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type SubscriptionCreateInput = {
    startDate: Date | string
    endDate: Date | string
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutSubscriptionInput
  }

  export type SubscriptionUncheckedCreateInput = {
    id?: number
    userId: number
    startDate: Date | string
    endDate: Date | string
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SubscriptionUpdateInput = {
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutSubscriptionNestedInput
  }

  export type SubscriptionUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    userId?: IntFieldUpdateOperationsInput | number
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SubscriptionCreateManyInput = {
    id?: number
    userId: number
    startDate: Date | string
    endDate: Date | string
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SubscriptionUpdateManyMutationInput = {
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SubscriptionUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    userId?: IntFieldUpdateOperationsInput | number
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OrganizationCreateInput = {
    name: string
    taxNumber?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    type?: $Enums.OrganizationType
    activityCode?: string | null
    activityName?: string | null
    isClientOrg?: boolean
    clients?: ClientCreateNestedManyWithoutOrganizationInput
    forms?: FormCreateNestedManyWithoutOrganizationInput
    members?: OrganizationMemberCreateNestedManyWithoutOrganizationInput
    createdBy: UserCreateNestedOneWithoutCreatedOrganizationsInput
    workers?: WorkerCreateNestedManyWithoutOrganizationInput
  }

  export type OrganizationUncheckedCreateInput = {
    id?: number
    name: string
    taxNumber?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    createdById: number
    type?: $Enums.OrganizationType
    activityCode?: string | null
    activityName?: string | null
    isClientOrg?: boolean
    clients?: ClientUncheckedCreateNestedManyWithoutOrganizationInput
    forms?: FormUncheckedCreateNestedManyWithoutOrganizationInput
    members?: OrganizationMemberUncheckedCreateNestedManyWithoutOrganizationInput
    workers?: WorkerUncheckedCreateNestedManyWithoutOrganizationInput
  }

  export type OrganizationUpdateInput = {
    name?: StringFieldUpdateOperationsInput | string
    taxNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    type?: EnumOrganizationTypeFieldUpdateOperationsInput | $Enums.OrganizationType
    activityCode?: NullableStringFieldUpdateOperationsInput | string | null
    activityName?: NullableStringFieldUpdateOperationsInput | string | null
    isClientOrg?: BoolFieldUpdateOperationsInput | boolean
    clients?: ClientUpdateManyWithoutOrganizationNestedInput
    forms?: FormUpdateManyWithoutOrganizationNestedInput
    members?: OrganizationMemberUpdateManyWithoutOrganizationNestedInput
    createdBy?: UserUpdateOneRequiredWithoutCreatedOrganizationsNestedInput
    workers?: WorkerUpdateManyWithoutOrganizationNestedInput
  }

  export type OrganizationUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    taxNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdById?: IntFieldUpdateOperationsInput | number
    type?: EnumOrganizationTypeFieldUpdateOperationsInput | $Enums.OrganizationType
    activityCode?: NullableStringFieldUpdateOperationsInput | string | null
    activityName?: NullableStringFieldUpdateOperationsInput | string | null
    isClientOrg?: BoolFieldUpdateOperationsInput | boolean
    clients?: ClientUncheckedUpdateManyWithoutOrganizationNestedInput
    forms?: FormUncheckedUpdateManyWithoutOrganizationNestedInput
    members?: OrganizationMemberUncheckedUpdateManyWithoutOrganizationNestedInput
    workers?: WorkerUncheckedUpdateManyWithoutOrganizationNestedInput
  }

  export type OrganizationCreateManyInput = {
    id?: number
    name: string
    taxNumber?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    createdById: number
    type?: $Enums.OrganizationType
    activityCode?: string | null
    activityName?: string | null
    isClientOrg?: boolean
  }

  export type OrganizationUpdateManyMutationInput = {
    name?: StringFieldUpdateOperationsInput | string
    taxNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    type?: EnumOrganizationTypeFieldUpdateOperationsInput | $Enums.OrganizationType
    activityCode?: NullableStringFieldUpdateOperationsInput | string | null
    activityName?: NullableStringFieldUpdateOperationsInput | string | null
    isClientOrg?: BoolFieldUpdateOperationsInput | boolean
  }

  export type OrganizationUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    taxNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdById?: IntFieldUpdateOperationsInput | number
    type?: EnumOrganizationTypeFieldUpdateOperationsInput | $Enums.OrganizationType
    activityCode?: NullableStringFieldUpdateOperationsInput | string | null
    activityName?: NullableStringFieldUpdateOperationsInput | string | null
    isClientOrg?: BoolFieldUpdateOperationsInput | boolean
  }

  export type WorkerCreateInput = {
    firstName: string
    lastName: string
    jmbg?: string | null
    startDate?: Date | string | null
    endDate?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    address?: string | null
    email?: string | null
    phone?: string | null
    role?: $Enums.WorkerRole
    idCardNumber?: string | null
    organization: OrganizationCreateNestedOneWithoutWorkersInput
  }

  export type WorkerUncheckedCreateInput = {
    id?: number
    organizationId: number
    firstName: string
    lastName: string
    jmbg?: string | null
    startDate?: Date | string | null
    endDate?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    address?: string | null
    email?: string | null
    phone?: string | null
    role?: $Enums.WorkerRole
    idCardNumber?: string | null
  }

  export type WorkerUpdateInput = {
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    address?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumWorkerRoleFieldUpdateOperationsInput | $Enums.WorkerRole
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
    organization?: OrganizationUpdateOneRequiredWithoutWorkersNestedInput
  }

  export type WorkerUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    organizationId?: IntFieldUpdateOperationsInput | number
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    address?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumWorkerRoleFieldUpdateOperationsInput | $Enums.WorkerRole
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type WorkerCreateManyInput = {
    id?: number
    organizationId: number
    firstName: string
    lastName: string
    jmbg?: string | null
    startDate?: Date | string | null
    endDate?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    address?: string | null
    email?: string | null
    phone?: string | null
    role?: $Enums.WorkerRole
    idCardNumber?: string | null
  }

  export type WorkerUpdateManyMutationInput = {
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    address?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumWorkerRoleFieldUpdateOperationsInput | $Enums.WorkerRole
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type WorkerUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    organizationId?: IntFieldUpdateOperationsInput | number
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    address?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumWorkerRoleFieldUpdateOperationsInput | $Enums.WorkerRole
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type OrganizationMemberCreateInput = {
    role?: $Enums.OrganizationRole
    joinedAt?: Date | string
    organization: OrganizationCreateNestedOneWithoutMembersInput
    user: UserCreateNestedOneWithoutOrganizationsInput
  }

  export type OrganizationMemberUncheckedCreateInput = {
    id?: number
    organizationId: number
    userId: number
    role?: $Enums.OrganizationRole
    joinedAt?: Date | string
  }

  export type OrganizationMemberUpdateInput = {
    role?: EnumOrganizationRoleFieldUpdateOperationsInput | $Enums.OrganizationRole
    joinedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    organization?: OrganizationUpdateOneRequiredWithoutMembersNestedInput
    user?: UserUpdateOneRequiredWithoutOrganizationsNestedInput
  }

  export type OrganizationMemberUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    organizationId?: IntFieldUpdateOperationsInput | number
    userId?: IntFieldUpdateOperationsInput | number
    role?: EnumOrganizationRoleFieldUpdateOperationsInput | $Enums.OrganizationRole
    joinedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OrganizationMemberCreateManyInput = {
    id?: number
    organizationId: number
    userId: number
    role?: $Enums.OrganizationRole
    joinedAt?: Date | string
  }

  export type OrganizationMemberUpdateManyMutationInput = {
    role?: EnumOrganizationRoleFieldUpdateOperationsInput | $Enums.OrganizationRole
    joinedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OrganizationMemberUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    organizationId?: IntFieldUpdateOperationsInput | number
    userId?: IntFieldUpdateOperationsInput | number
    role?: EnumOrganizationRoleFieldUpdateOperationsInput | $Enums.OrganizationRole
    joinedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ClientCreateInput = {
    type?: $Enums.ClientType
    firstName?: string | null
    lastName?: string | null
    companyName?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    jmbg?: string | null
    taxNumber?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    amortizacijaOnly?: boolean
    idCardNumber?: string | null
    createdBy?: UserCreateNestedOneWithoutCreatedClientsInput
    organization?: OrganizationCreateNestedOneWithoutClientsInput
    forms?: FormCreateNestedManyWithoutClientInput
  }

  export type ClientUncheckedCreateInput = {
    id?: number
    organizationId?: number | null
    type?: $Enums.ClientType
    firstName?: string | null
    lastName?: string | null
    companyName?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    jmbg?: string | null
    taxNumber?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    createdById?: number | null
    amortizacijaOnly?: boolean
    idCardNumber?: string | null
    forms?: FormUncheckedCreateNestedManyWithoutClientInput
  }

  export type ClientUpdateInput = {
    type?: EnumClientTypeFieldUpdateOperationsInput | $Enums.ClientType
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    companyName?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    taxNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    amortizacijaOnly?: BoolFieldUpdateOperationsInput | boolean
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: UserUpdateOneWithoutCreatedClientsNestedInput
    organization?: OrganizationUpdateOneWithoutClientsNestedInput
    forms?: FormUpdateManyWithoutClientNestedInput
  }

  export type ClientUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    organizationId?: NullableIntFieldUpdateOperationsInput | number | null
    type?: EnumClientTypeFieldUpdateOperationsInput | $Enums.ClientType
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    companyName?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    taxNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdById?: NullableIntFieldUpdateOperationsInput | number | null
    amortizacijaOnly?: BoolFieldUpdateOperationsInput | boolean
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
    forms?: FormUncheckedUpdateManyWithoutClientNestedInput
  }

  export type ClientCreateManyInput = {
    id?: number
    organizationId?: number | null
    type?: $Enums.ClientType
    firstName?: string | null
    lastName?: string | null
    companyName?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    jmbg?: string | null
    taxNumber?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    createdById?: number | null
    amortizacijaOnly?: boolean
    idCardNumber?: string | null
  }

  export type ClientUpdateManyMutationInput = {
    type?: EnumClientTypeFieldUpdateOperationsInput | $Enums.ClientType
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    companyName?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    taxNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    amortizacijaOnly?: BoolFieldUpdateOperationsInput | boolean
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ClientUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    organizationId?: NullableIntFieldUpdateOperationsInput | number | null
    type?: EnumClientTypeFieldUpdateOperationsInput | $Enums.ClientType
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    companyName?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    taxNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdById?: NullableIntFieldUpdateOperationsInput | number | null
    amortizacijaOnly?: BoolFieldUpdateOperationsInput | boolean
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type FormCreateInput = {
    type: $Enums.forms_type
    status?: $Enums.FormStatus
    year: number
    month?: number | null
    title?: string | null
    pdfUrl?: string | null
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    attachments?: FormAttachmentCreateNestedManyWithoutFormInput
    versions?: FormVersionCreateNestedManyWithoutFormInput
    client?: ClientCreateNestedOneWithoutFormsInput
    createdBy: UserCreateNestedOneWithoutCreatedFormsInput
    organization?: OrganizationCreateNestedOneWithoutFormsInput
    updatedBy?: UserCreateNestedOneWithoutUpdatedFormsInput
  }

  export type FormUncheckedCreateInput = {
    id?: number
    type: $Enums.forms_type
    status?: $Enums.FormStatus
    year: number
    month?: number | null
    title?: string | null
    organizationId?: number | null
    clientId?: number | null
    createdById: number
    updatedById?: number | null
    pdfUrl?: string | null
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    attachments?: FormAttachmentUncheckedCreateNestedManyWithoutFormInput
    versions?: FormVersionUncheckedCreateNestedManyWithoutFormInput
  }

  export type FormUpdateInput = {
    type?: Enumforms_typeFieldUpdateOperationsInput | $Enums.forms_type
    status?: EnumFormStatusFieldUpdateOperationsInput | $Enums.FormStatus
    year?: IntFieldUpdateOperationsInput | number
    month?: NullableIntFieldUpdateOperationsInput | number | null
    title?: NullableStringFieldUpdateOperationsInput | string | null
    pdfUrl?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    attachments?: FormAttachmentUpdateManyWithoutFormNestedInput
    versions?: FormVersionUpdateManyWithoutFormNestedInput
    client?: ClientUpdateOneWithoutFormsNestedInput
    createdBy?: UserUpdateOneRequiredWithoutCreatedFormsNestedInput
    organization?: OrganizationUpdateOneWithoutFormsNestedInput
    updatedBy?: UserUpdateOneWithoutUpdatedFormsNestedInput
  }

  export type FormUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    type?: Enumforms_typeFieldUpdateOperationsInput | $Enums.forms_type
    status?: EnumFormStatusFieldUpdateOperationsInput | $Enums.FormStatus
    year?: IntFieldUpdateOperationsInput | number
    month?: NullableIntFieldUpdateOperationsInput | number | null
    title?: NullableStringFieldUpdateOperationsInput | string | null
    organizationId?: NullableIntFieldUpdateOperationsInput | number | null
    clientId?: NullableIntFieldUpdateOperationsInput | number | null
    createdById?: IntFieldUpdateOperationsInput | number
    updatedById?: NullableIntFieldUpdateOperationsInput | number | null
    pdfUrl?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    attachments?: FormAttachmentUncheckedUpdateManyWithoutFormNestedInput
    versions?: FormVersionUncheckedUpdateManyWithoutFormNestedInput
  }

  export type FormCreateManyInput = {
    id?: number
    type: $Enums.forms_type
    status?: $Enums.FormStatus
    year: number
    month?: number | null
    title?: string | null
    organizationId?: number | null
    clientId?: number | null
    createdById: number
    updatedById?: number | null
    pdfUrl?: string | null
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FormUpdateManyMutationInput = {
    type?: Enumforms_typeFieldUpdateOperationsInput | $Enums.forms_type
    status?: EnumFormStatusFieldUpdateOperationsInput | $Enums.FormStatus
    year?: IntFieldUpdateOperationsInput | number
    month?: NullableIntFieldUpdateOperationsInput | number | null
    title?: NullableStringFieldUpdateOperationsInput | string | null
    pdfUrl?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FormUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    type?: Enumforms_typeFieldUpdateOperationsInput | $Enums.forms_type
    status?: EnumFormStatusFieldUpdateOperationsInput | $Enums.FormStatus
    year?: IntFieldUpdateOperationsInput | number
    month?: NullableIntFieldUpdateOperationsInput | number | null
    title?: NullableStringFieldUpdateOperationsInput | string | null
    organizationId?: NullableIntFieldUpdateOperationsInput | number | null
    clientId?: NullableIntFieldUpdateOperationsInput | number | null
    createdById?: IntFieldUpdateOperationsInput | number
    updatedById?: NullableIntFieldUpdateOperationsInput | number | null
    pdfUrl?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FormVersionCreateInput = {
    versionNumber: number
    data: string
    pdfUrl?: string | null
    createdAt?: Date | string
    form: FormCreateNestedOneWithoutVersionsInput
  }

  export type FormVersionUncheckedCreateInput = {
    id?: number
    formId: number
    versionNumber: number
    data: string
    pdfUrl?: string | null
    createdAt?: Date | string
  }

  export type FormVersionUpdateInput = {
    versionNumber?: IntFieldUpdateOperationsInput | number
    data?: StringFieldUpdateOperationsInput | string
    pdfUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    form?: FormUpdateOneRequiredWithoutVersionsNestedInput
  }

  export type FormVersionUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    formId?: IntFieldUpdateOperationsInput | number
    versionNumber?: IntFieldUpdateOperationsInput | number
    data?: StringFieldUpdateOperationsInput | string
    pdfUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FormVersionCreateManyInput = {
    id?: number
    formId: number
    versionNumber: number
    data: string
    pdfUrl?: string | null
    createdAt?: Date | string
  }

  export type FormVersionUpdateManyMutationInput = {
    versionNumber?: IntFieldUpdateOperationsInput | number
    data?: StringFieldUpdateOperationsInput | string
    pdfUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FormVersionUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    formId?: IntFieldUpdateOperationsInput | number
    versionNumber?: IntFieldUpdateOperationsInput | number
    data?: StringFieldUpdateOperationsInput | string
    pdfUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FormAttachmentCreateInput = {
    fileName: string
    fileUrl: string
    mimeType?: string | null
    createdAt?: Date | string
    form: FormCreateNestedOneWithoutAttachmentsInput
  }

  export type FormAttachmentUncheckedCreateInput = {
    id?: number
    formId: number
    fileName: string
    fileUrl: string
    mimeType?: string | null
    createdAt?: Date | string
  }

  export type FormAttachmentUpdateInput = {
    fileName?: StringFieldUpdateOperationsInput | string
    fileUrl?: StringFieldUpdateOperationsInput | string
    mimeType?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    form?: FormUpdateOneRequiredWithoutAttachmentsNestedInput
  }

  export type FormAttachmentUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    formId?: IntFieldUpdateOperationsInput | number
    fileName?: StringFieldUpdateOperationsInput | string
    fileUrl?: StringFieldUpdateOperationsInput | string
    mimeType?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FormAttachmentCreateManyInput = {
    id?: number
    formId: number
    fileName: string
    fileUrl: string
    mimeType?: string | null
    createdAt?: Date | string
  }

  export type FormAttachmentUpdateManyMutationInput = {
    fileName?: StringFieldUpdateOperationsInput | string
    fileUrl?: StringFieldUpdateOperationsInput | string
    mimeType?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FormAttachmentUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    formId?: IntFieldUpdateOperationsInput | number
    fileName?: StringFieldUpdateOperationsInput | string
    fileUrl?: StringFieldUpdateOperationsInput | string
    mimeType?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type Enumusers_roleFilter<$PrismaModel = never> = {
    equals?: $Enums.users_role | Enumusers_roleFieldRefInput<$PrismaModel>
    in?: $Enums.users_role[]
    notIn?: $Enums.users_role[]
    not?: NestedEnumusers_roleFilter<$PrismaModel> | $Enums.users_role
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type ClientListRelationFilter = {
    every?: ClientWhereInput
    some?: ClientWhereInput
    none?: ClientWhereInput
  }

  export type FormListRelationFilter = {
    every?: FormWhereInput
    some?: FormWhereInput
    none?: FormWhereInput
  }

  export type OrganizationMemberListRelationFilter = {
    every?: OrganizationMemberWhereInput
    some?: OrganizationMemberWhereInput
    none?: OrganizationMemberWhereInput
  }

  export type OrganizationListRelationFilter = {
    every?: OrganizationWhereInput
    some?: OrganizationWhereInput
    none?: OrganizationWhereInput
  }

  export type SubscriptionNullableScalarRelationFilter = {
    is?: SubscriptionWhereInput | null
    isNot?: SubscriptionWhereInput | null
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type ClientOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type FormOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type OrganizationMemberOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type OrganizationOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserOrderByRelevanceInput = {
    fields: UserOrderByRelevanceFieldEnum | UserOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    googleId?: SortOrder
    email?: SortOrder
    password?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    phone?: SortOrder
    address?: SortOrder
    role?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    jmbg?: SortOrder
    passwordResetToken?: SortOrder
    passwordResetTokenExpiry?: SortOrder
    emailVerificationExpiry?: SortOrder
    emailVerificationToken?: SortOrder
    isEmailVerified?: SortOrder
    idCardNumber?: SortOrder
  }

  export type UserAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    googleId?: SortOrder
    email?: SortOrder
    password?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    phone?: SortOrder
    address?: SortOrder
    role?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    jmbg?: SortOrder
    passwordResetToken?: SortOrder
    passwordResetTokenExpiry?: SortOrder
    emailVerificationExpiry?: SortOrder
    emailVerificationToken?: SortOrder
    isEmailVerified?: SortOrder
    idCardNumber?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    googleId?: SortOrder
    email?: SortOrder
    password?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    phone?: SortOrder
    address?: SortOrder
    role?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    jmbg?: SortOrder
    passwordResetToken?: SortOrder
    passwordResetTokenExpiry?: SortOrder
    emailVerificationExpiry?: SortOrder
    emailVerificationToken?: SortOrder
    isEmailVerified?: SortOrder
    idCardNumber?: SortOrder
  }

  export type UserSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type Enumusers_roleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.users_role | Enumusers_roleFieldRefInput<$PrismaModel>
    in?: $Enums.users_role[]
    notIn?: $Enums.users_role[]
    not?: NestedEnumusers_roleWithAggregatesFilter<$PrismaModel> | $Enums.users_role
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumusers_roleFilter<$PrismaModel>
    _max?: NestedEnumusers_roleFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type UserScalarRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type SubscriptionCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SubscriptionAvgOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
  }

  export type SubscriptionMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SubscriptionMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SubscriptionSumOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
  }

  export type EnumOrganizationTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.OrganizationType | EnumOrganizationTypeFieldRefInput<$PrismaModel>
    in?: $Enums.OrganizationType[]
    notIn?: $Enums.OrganizationType[]
    not?: NestedEnumOrganizationTypeFilter<$PrismaModel> | $Enums.OrganizationType
  }

  export type WorkerListRelationFilter = {
    every?: WorkerWhereInput
    some?: WorkerWhereInput
    none?: WorkerWhereInput
  }

  export type WorkerOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type OrganizationOrderByRelevanceInput = {
    fields: OrganizationOrderByRelevanceFieldEnum | OrganizationOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type OrganizationCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    taxNumber?: SortOrder
    email?: SortOrder
    phone?: SortOrder
    address?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    createdById?: SortOrder
    type?: SortOrder
    activityCode?: SortOrder
    activityName?: SortOrder
    isClientOrg?: SortOrder
  }

  export type OrganizationAvgOrderByAggregateInput = {
    id?: SortOrder
    createdById?: SortOrder
  }

  export type OrganizationMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    taxNumber?: SortOrder
    email?: SortOrder
    phone?: SortOrder
    address?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    createdById?: SortOrder
    type?: SortOrder
    activityCode?: SortOrder
    activityName?: SortOrder
    isClientOrg?: SortOrder
  }

  export type OrganizationMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    taxNumber?: SortOrder
    email?: SortOrder
    phone?: SortOrder
    address?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    createdById?: SortOrder
    type?: SortOrder
    activityCode?: SortOrder
    activityName?: SortOrder
    isClientOrg?: SortOrder
  }

  export type OrganizationSumOrderByAggregateInput = {
    id?: SortOrder
    createdById?: SortOrder
  }

  export type EnumOrganizationTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.OrganizationType | EnumOrganizationTypeFieldRefInput<$PrismaModel>
    in?: $Enums.OrganizationType[]
    notIn?: $Enums.OrganizationType[]
    not?: NestedEnumOrganizationTypeWithAggregatesFilter<$PrismaModel> | $Enums.OrganizationType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumOrganizationTypeFilter<$PrismaModel>
    _max?: NestedEnumOrganizationTypeFilter<$PrismaModel>
  }

  export type EnumWorkerRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.WorkerRole | EnumWorkerRoleFieldRefInput<$PrismaModel>
    in?: $Enums.WorkerRole[]
    notIn?: $Enums.WorkerRole[]
    not?: NestedEnumWorkerRoleFilter<$PrismaModel> | $Enums.WorkerRole
  }

  export type OrganizationScalarRelationFilter = {
    is?: OrganizationWhereInput
    isNot?: OrganizationWhereInput
  }

  export type WorkerOrderByRelevanceInput = {
    fields: WorkerOrderByRelevanceFieldEnum | WorkerOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type WorkerCountOrderByAggregateInput = {
    id?: SortOrder
    organizationId?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    jmbg?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    address?: SortOrder
    email?: SortOrder
    phone?: SortOrder
    role?: SortOrder
    idCardNumber?: SortOrder
  }

  export type WorkerAvgOrderByAggregateInput = {
    id?: SortOrder
    organizationId?: SortOrder
  }

  export type WorkerMaxOrderByAggregateInput = {
    id?: SortOrder
    organizationId?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    jmbg?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    address?: SortOrder
    email?: SortOrder
    phone?: SortOrder
    role?: SortOrder
    idCardNumber?: SortOrder
  }

  export type WorkerMinOrderByAggregateInput = {
    id?: SortOrder
    organizationId?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    jmbg?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    address?: SortOrder
    email?: SortOrder
    phone?: SortOrder
    role?: SortOrder
    idCardNumber?: SortOrder
  }

  export type WorkerSumOrderByAggregateInput = {
    id?: SortOrder
    organizationId?: SortOrder
  }

  export type EnumWorkerRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.WorkerRole | EnumWorkerRoleFieldRefInput<$PrismaModel>
    in?: $Enums.WorkerRole[]
    notIn?: $Enums.WorkerRole[]
    not?: NestedEnumWorkerRoleWithAggregatesFilter<$PrismaModel> | $Enums.WorkerRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumWorkerRoleFilter<$PrismaModel>
    _max?: NestedEnumWorkerRoleFilter<$PrismaModel>
  }

  export type EnumOrganizationRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.OrganizationRole | EnumOrganizationRoleFieldRefInput<$PrismaModel>
    in?: $Enums.OrganizationRole[]
    notIn?: $Enums.OrganizationRole[]
    not?: NestedEnumOrganizationRoleFilter<$PrismaModel> | $Enums.OrganizationRole
  }

  export type OrganizationMemberOrganizationIdUserIdCompoundUniqueInput = {
    organizationId: number
    userId: number
  }

  export type OrganizationMemberCountOrderByAggregateInput = {
    id?: SortOrder
    organizationId?: SortOrder
    userId?: SortOrder
    role?: SortOrder
    joinedAt?: SortOrder
  }

  export type OrganizationMemberAvgOrderByAggregateInput = {
    id?: SortOrder
    organizationId?: SortOrder
    userId?: SortOrder
  }

  export type OrganizationMemberMaxOrderByAggregateInput = {
    id?: SortOrder
    organizationId?: SortOrder
    userId?: SortOrder
    role?: SortOrder
    joinedAt?: SortOrder
  }

  export type OrganizationMemberMinOrderByAggregateInput = {
    id?: SortOrder
    organizationId?: SortOrder
    userId?: SortOrder
    role?: SortOrder
    joinedAt?: SortOrder
  }

  export type OrganizationMemberSumOrderByAggregateInput = {
    id?: SortOrder
    organizationId?: SortOrder
    userId?: SortOrder
  }

  export type EnumOrganizationRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.OrganizationRole | EnumOrganizationRoleFieldRefInput<$PrismaModel>
    in?: $Enums.OrganizationRole[]
    notIn?: $Enums.OrganizationRole[]
    not?: NestedEnumOrganizationRoleWithAggregatesFilter<$PrismaModel> | $Enums.OrganizationRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumOrganizationRoleFilter<$PrismaModel>
    _max?: NestedEnumOrganizationRoleFilter<$PrismaModel>
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type EnumClientTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.ClientType | EnumClientTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ClientType[]
    notIn?: $Enums.ClientType[]
    not?: NestedEnumClientTypeFilter<$PrismaModel> | $Enums.ClientType
  }

  export type UserNullableScalarRelationFilter = {
    is?: UserWhereInput | null
    isNot?: UserWhereInput | null
  }

  export type OrganizationNullableScalarRelationFilter = {
    is?: OrganizationWhereInput | null
    isNot?: OrganizationWhereInput | null
  }

  export type ClientOrderByRelevanceInput = {
    fields: ClientOrderByRelevanceFieldEnum | ClientOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type ClientCountOrderByAggregateInput = {
    id?: SortOrder
    organizationId?: SortOrder
    type?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    companyName?: SortOrder
    email?: SortOrder
    phone?: SortOrder
    address?: SortOrder
    jmbg?: SortOrder
    taxNumber?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    createdById?: SortOrder
    amortizacijaOnly?: SortOrder
    idCardNumber?: SortOrder
  }

  export type ClientAvgOrderByAggregateInput = {
    id?: SortOrder
    organizationId?: SortOrder
    createdById?: SortOrder
  }

  export type ClientMaxOrderByAggregateInput = {
    id?: SortOrder
    organizationId?: SortOrder
    type?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    companyName?: SortOrder
    email?: SortOrder
    phone?: SortOrder
    address?: SortOrder
    jmbg?: SortOrder
    taxNumber?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    createdById?: SortOrder
    amortizacijaOnly?: SortOrder
    idCardNumber?: SortOrder
  }

  export type ClientMinOrderByAggregateInput = {
    id?: SortOrder
    organizationId?: SortOrder
    type?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    companyName?: SortOrder
    email?: SortOrder
    phone?: SortOrder
    address?: SortOrder
    jmbg?: SortOrder
    taxNumber?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    createdById?: SortOrder
    amortizacijaOnly?: SortOrder
    idCardNumber?: SortOrder
  }

  export type ClientSumOrderByAggregateInput = {
    id?: SortOrder
    organizationId?: SortOrder
    createdById?: SortOrder
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type EnumClientTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ClientType | EnumClientTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ClientType[]
    notIn?: $Enums.ClientType[]
    not?: NestedEnumClientTypeWithAggregatesFilter<$PrismaModel> | $Enums.ClientType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumClientTypeFilter<$PrismaModel>
    _max?: NestedEnumClientTypeFilter<$PrismaModel>
  }

  export type Enumforms_typeFilter<$PrismaModel = never> = {
    equals?: $Enums.forms_type | Enumforms_typeFieldRefInput<$PrismaModel>
    in?: $Enums.forms_type[]
    notIn?: $Enums.forms_type[]
    not?: NestedEnumforms_typeFilter<$PrismaModel> | $Enums.forms_type
  }

  export type EnumFormStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.FormStatus | EnumFormStatusFieldRefInput<$PrismaModel>
    in?: $Enums.FormStatus[]
    notIn?: $Enums.FormStatus[]
    not?: NestedEnumFormStatusFilter<$PrismaModel> | $Enums.FormStatus
  }

  export type FormAttachmentListRelationFilter = {
    every?: FormAttachmentWhereInput
    some?: FormAttachmentWhereInput
    none?: FormAttachmentWhereInput
  }

  export type FormVersionListRelationFilter = {
    every?: FormVersionWhereInput
    some?: FormVersionWhereInput
    none?: FormVersionWhereInput
  }

  export type ClientNullableScalarRelationFilter = {
    is?: ClientWhereInput | null
    isNot?: ClientWhereInput | null
  }

  export type FormAttachmentOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type FormVersionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type FormOrderByRelevanceInput = {
    fields: FormOrderByRelevanceFieldEnum | FormOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type FormCountOrderByAggregateInput = {
    id?: SortOrder
    type?: SortOrder
    status?: SortOrder
    year?: SortOrder
    month?: SortOrder
    title?: SortOrder
    organizationId?: SortOrder
    clientId?: SortOrder
    createdById?: SortOrder
    updatedById?: SortOrder
    pdfUrl?: SortOrder
    notes?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FormAvgOrderByAggregateInput = {
    id?: SortOrder
    year?: SortOrder
    month?: SortOrder
    organizationId?: SortOrder
    clientId?: SortOrder
    createdById?: SortOrder
    updatedById?: SortOrder
  }

  export type FormMaxOrderByAggregateInput = {
    id?: SortOrder
    type?: SortOrder
    status?: SortOrder
    year?: SortOrder
    month?: SortOrder
    title?: SortOrder
    organizationId?: SortOrder
    clientId?: SortOrder
    createdById?: SortOrder
    updatedById?: SortOrder
    pdfUrl?: SortOrder
    notes?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FormMinOrderByAggregateInput = {
    id?: SortOrder
    type?: SortOrder
    status?: SortOrder
    year?: SortOrder
    month?: SortOrder
    title?: SortOrder
    organizationId?: SortOrder
    clientId?: SortOrder
    createdById?: SortOrder
    updatedById?: SortOrder
    pdfUrl?: SortOrder
    notes?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FormSumOrderByAggregateInput = {
    id?: SortOrder
    year?: SortOrder
    month?: SortOrder
    organizationId?: SortOrder
    clientId?: SortOrder
    createdById?: SortOrder
    updatedById?: SortOrder
  }

  export type Enumforms_typeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.forms_type | Enumforms_typeFieldRefInput<$PrismaModel>
    in?: $Enums.forms_type[]
    notIn?: $Enums.forms_type[]
    not?: NestedEnumforms_typeWithAggregatesFilter<$PrismaModel> | $Enums.forms_type
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumforms_typeFilter<$PrismaModel>
    _max?: NestedEnumforms_typeFilter<$PrismaModel>
  }

  export type EnumFormStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.FormStatus | EnumFormStatusFieldRefInput<$PrismaModel>
    in?: $Enums.FormStatus[]
    notIn?: $Enums.FormStatus[]
    not?: NestedEnumFormStatusWithAggregatesFilter<$PrismaModel> | $Enums.FormStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumFormStatusFilter<$PrismaModel>
    _max?: NestedEnumFormStatusFilter<$PrismaModel>
  }

  export type FormScalarRelationFilter = {
    is?: FormWhereInput
    isNot?: FormWhereInput
  }

  export type FormVersionOrderByRelevanceInput = {
    fields: FormVersionOrderByRelevanceFieldEnum | FormVersionOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type FormVersionFormIdVersionNumberCompoundUniqueInput = {
    formId: number
    versionNumber: number
  }

  export type FormVersionCountOrderByAggregateInput = {
    id?: SortOrder
    formId?: SortOrder
    versionNumber?: SortOrder
    data?: SortOrder
    pdfUrl?: SortOrder
    createdAt?: SortOrder
  }

  export type FormVersionAvgOrderByAggregateInput = {
    id?: SortOrder
    formId?: SortOrder
    versionNumber?: SortOrder
  }

  export type FormVersionMaxOrderByAggregateInput = {
    id?: SortOrder
    formId?: SortOrder
    versionNumber?: SortOrder
    data?: SortOrder
    pdfUrl?: SortOrder
    createdAt?: SortOrder
  }

  export type FormVersionMinOrderByAggregateInput = {
    id?: SortOrder
    formId?: SortOrder
    versionNumber?: SortOrder
    data?: SortOrder
    pdfUrl?: SortOrder
    createdAt?: SortOrder
  }

  export type FormVersionSumOrderByAggregateInput = {
    id?: SortOrder
    formId?: SortOrder
    versionNumber?: SortOrder
  }

  export type FormAttachmentOrderByRelevanceInput = {
    fields: FormAttachmentOrderByRelevanceFieldEnum | FormAttachmentOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type FormAttachmentCountOrderByAggregateInput = {
    id?: SortOrder
    formId?: SortOrder
    fileName?: SortOrder
    fileUrl?: SortOrder
    mimeType?: SortOrder
    createdAt?: SortOrder
  }

  export type FormAttachmentAvgOrderByAggregateInput = {
    id?: SortOrder
    formId?: SortOrder
  }

  export type FormAttachmentMaxOrderByAggregateInput = {
    id?: SortOrder
    formId?: SortOrder
    fileName?: SortOrder
    fileUrl?: SortOrder
    mimeType?: SortOrder
    createdAt?: SortOrder
  }

  export type FormAttachmentMinOrderByAggregateInput = {
    id?: SortOrder
    formId?: SortOrder
    fileName?: SortOrder
    fileUrl?: SortOrder
    mimeType?: SortOrder
    createdAt?: SortOrder
  }

  export type FormAttachmentSumOrderByAggregateInput = {
    id?: SortOrder
    formId?: SortOrder
  }

  export type ClientCreateNestedManyWithoutCreatedByInput = {
    create?: XOR<ClientCreateWithoutCreatedByInput, ClientUncheckedCreateWithoutCreatedByInput> | ClientCreateWithoutCreatedByInput[] | ClientUncheckedCreateWithoutCreatedByInput[]
    connectOrCreate?: ClientCreateOrConnectWithoutCreatedByInput | ClientCreateOrConnectWithoutCreatedByInput[]
    createMany?: ClientCreateManyCreatedByInputEnvelope
    connect?: ClientWhereUniqueInput | ClientWhereUniqueInput[]
  }

  export type FormCreateNestedManyWithoutCreatedByInput = {
    create?: XOR<FormCreateWithoutCreatedByInput, FormUncheckedCreateWithoutCreatedByInput> | FormCreateWithoutCreatedByInput[] | FormUncheckedCreateWithoutCreatedByInput[]
    connectOrCreate?: FormCreateOrConnectWithoutCreatedByInput | FormCreateOrConnectWithoutCreatedByInput[]
    createMany?: FormCreateManyCreatedByInputEnvelope
    connect?: FormWhereUniqueInput | FormWhereUniqueInput[]
  }

  export type FormCreateNestedManyWithoutUpdatedByInput = {
    create?: XOR<FormCreateWithoutUpdatedByInput, FormUncheckedCreateWithoutUpdatedByInput> | FormCreateWithoutUpdatedByInput[] | FormUncheckedCreateWithoutUpdatedByInput[]
    connectOrCreate?: FormCreateOrConnectWithoutUpdatedByInput | FormCreateOrConnectWithoutUpdatedByInput[]
    createMany?: FormCreateManyUpdatedByInputEnvelope
    connect?: FormWhereUniqueInput | FormWhereUniqueInput[]
  }

  export type OrganizationMemberCreateNestedManyWithoutUserInput = {
    create?: XOR<OrganizationMemberCreateWithoutUserInput, OrganizationMemberUncheckedCreateWithoutUserInput> | OrganizationMemberCreateWithoutUserInput[] | OrganizationMemberUncheckedCreateWithoutUserInput[]
    connectOrCreate?: OrganizationMemberCreateOrConnectWithoutUserInput | OrganizationMemberCreateOrConnectWithoutUserInput[]
    createMany?: OrganizationMemberCreateManyUserInputEnvelope
    connect?: OrganizationMemberWhereUniqueInput | OrganizationMemberWhereUniqueInput[]
  }

  export type OrganizationCreateNestedManyWithoutCreatedByInput = {
    create?: XOR<OrganizationCreateWithoutCreatedByInput, OrganizationUncheckedCreateWithoutCreatedByInput> | OrganizationCreateWithoutCreatedByInput[] | OrganizationUncheckedCreateWithoutCreatedByInput[]
    connectOrCreate?: OrganizationCreateOrConnectWithoutCreatedByInput | OrganizationCreateOrConnectWithoutCreatedByInput[]
    createMany?: OrganizationCreateManyCreatedByInputEnvelope
    connect?: OrganizationWhereUniqueInput | OrganizationWhereUniqueInput[]
  }

  export type SubscriptionCreateNestedOneWithoutUserInput = {
    create?: XOR<SubscriptionCreateWithoutUserInput, SubscriptionUncheckedCreateWithoutUserInput>
    connectOrCreate?: SubscriptionCreateOrConnectWithoutUserInput
    connect?: SubscriptionWhereUniqueInput
  }

  export type ClientUncheckedCreateNestedManyWithoutCreatedByInput = {
    create?: XOR<ClientCreateWithoutCreatedByInput, ClientUncheckedCreateWithoutCreatedByInput> | ClientCreateWithoutCreatedByInput[] | ClientUncheckedCreateWithoutCreatedByInput[]
    connectOrCreate?: ClientCreateOrConnectWithoutCreatedByInput | ClientCreateOrConnectWithoutCreatedByInput[]
    createMany?: ClientCreateManyCreatedByInputEnvelope
    connect?: ClientWhereUniqueInput | ClientWhereUniqueInput[]
  }

  export type FormUncheckedCreateNestedManyWithoutCreatedByInput = {
    create?: XOR<FormCreateWithoutCreatedByInput, FormUncheckedCreateWithoutCreatedByInput> | FormCreateWithoutCreatedByInput[] | FormUncheckedCreateWithoutCreatedByInput[]
    connectOrCreate?: FormCreateOrConnectWithoutCreatedByInput | FormCreateOrConnectWithoutCreatedByInput[]
    createMany?: FormCreateManyCreatedByInputEnvelope
    connect?: FormWhereUniqueInput | FormWhereUniqueInput[]
  }

  export type FormUncheckedCreateNestedManyWithoutUpdatedByInput = {
    create?: XOR<FormCreateWithoutUpdatedByInput, FormUncheckedCreateWithoutUpdatedByInput> | FormCreateWithoutUpdatedByInput[] | FormUncheckedCreateWithoutUpdatedByInput[]
    connectOrCreate?: FormCreateOrConnectWithoutUpdatedByInput | FormCreateOrConnectWithoutUpdatedByInput[]
    createMany?: FormCreateManyUpdatedByInputEnvelope
    connect?: FormWhereUniqueInput | FormWhereUniqueInput[]
  }

  export type OrganizationMemberUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<OrganizationMemberCreateWithoutUserInput, OrganizationMemberUncheckedCreateWithoutUserInput> | OrganizationMemberCreateWithoutUserInput[] | OrganizationMemberUncheckedCreateWithoutUserInput[]
    connectOrCreate?: OrganizationMemberCreateOrConnectWithoutUserInput | OrganizationMemberCreateOrConnectWithoutUserInput[]
    createMany?: OrganizationMemberCreateManyUserInputEnvelope
    connect?: OrganizationMemberWhereUniqueInput | OrganizationMemberWhereUniqueInput[]
  }

  export type OrganizationUncheckedCreateNestedManyWithoutCreatedByInput = {
    create?: XOR<OrganizationCreateWithoutCreatedByInput, OrganizationUncheckedCreateWithoutCreatedByInput> | OrganizationCreateWithoutCreatedByInput[] | OrganizationUncheckedCreateWithoutCreatedByInput[]
    connectOrCreate?: OrganizationCreateOrConnectWithoutCreatedByInput | OrganizationCreateOrConnectWithoutCreatedByInput[]
    createMany?: OrganizationCreateManyCreatedByInputEnvelope
    connect?: OrganizationWhereUniqueInput | OrganizationWhereUniqueInput[]
  }

  export type SubscriptionUncheckedCreateNestedOneWithoutUserInput = {
    create?: XOR<SubscriptionCreateWithoutUserInput, SubscriptionUncheckedCreateWithoutUserInput>
    connectOrCreate?: SubscriptionCreateOrConnectWithoutUserInput
    connect?: SubscriptionWhereUniqueInput
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type Enumusers_roleFieldUpdateOperationsInput = {
    set?: $Enums.users_role
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type ClientUpdateManyWithoutCreatedByNestedInput = {
    create?: XOR<ClientCreateWithoutCreatedByInput, ClientUncheckedCreateWithoutCreatedByInput> | ClientCreateWithoutCreatedByInput[] | ClientUncheckedCreateWithoutCreatedByInput[]
    connectOrCreate?: ClientCreateOrConnectWithoutCreatedByInput | ClientCreateOrConnectWithoutCreatedByInput[]
    upsert?: ClientUpsertWithWhereUniqueWithoutCreatedByInput | ClientUpsertWithWhereUniqueWithoutCreatedByInput[]
    createMany?: ClientCreateManyCreatedByInputEnvelope
    set?: ClientWhereUniqueInput | ClientWhereUniqueInput[]
    disconnect?: ClientWhereUniqueInput | ClientWhereUniqueInput[]
    delete?: ClientWhereUniqueInput | ClientWhereUniqueInput[]
    connect?: ClientWhereUniqueInput | ClientWhereUniqueInput[]
    update?: ClientUpdateWithWhereUniqueWithoutCreatedByInput | ClientUpdateWithWhereUniqueWithoutCreatedByInput[]
    updateMany?: ClientUpdateManyWithWhereWithoutCreatedByInput | ClientUpdateManyWithWhereWithoutCreatedByInput[]
    deleteMany?: ClientScalarWhereInput | ClientScalarWhereInput[]
  }

  export type FormUpdateManyWithoutCreatedByNestedInput = {
    create?: XOR<FormCreateWithoutCreatedByInput, FormUncheckedCreateWithoutCreatedByInput> | FormCreateWithoutCreatedByInput[] | FormUncheckedCreateWithoutCreatedByInput[]
    connectOrCreate?: FormCreateOrConnectWithoutCreatedByInput | FormCreateOrConnectWithoutCreatedByInput[]
    upsert?: FormUpsertWithWhereUniqueWithoutCreatedByInput | FormUpsertWithWhereUniqueWithoutCreatedByInput[]
    createMany?: FormCreateManyCreatedByInputEnvelope
    set?: FormWhereUniqueInput | FormWhereUniqueInput[]
    disconnect?: FormWhereUniqueInput | FormWhereUniqueInput[]
    delete?: FormWhereUniqueInput | FormWhereUniqueInput[]
    connect?: FormWhereUniqueInput | FormWhereUniqueInput[]
    update?: FormUpdateWithWhereUniqueWithoutCreatedByInput | FormUpdateWithWhereUniqueWithoutCreatedByInput[]
    updateMany?: FormUpdateManyWithWhereWithoutCreatedByInput | FormUpdateManyWithWhereWithoutCreatedByInput[]
    deleteMany?: FormScalarWhereInput | FormScalarWhereInput[]
  }

  export type FormUpdateManyWithoutUpdatedByNestedInput = {
    create?: XOR<FormCreateWithoutUpdatedByInput, FormUncheckedCreateWithoutUpdatedByInput> | FormCreateWithoutUpdatedByInput[] | FormUncheckedCreateWithoutUpdatedByInput[]
    connectOrCreate?: FormCreateOrConnectWithoutUpdatedByInput | FormCreateOrConnectWithoutUpdatedByInput[]
    upsert?: FormUpsertWithWhereUniqueWithoutUpdatedByInput | FormUpsertWithWhereUniqueWithoutUpdatedByInput[]
    createMany?: FormCreateManyUpdatedByInputEnvelope
    set?: FormWhereUniqueInput | FormWhereUniqueInput[]
    disconnect?: FormWhereUniqueInput | FormWhereUniqueInput[]
    delete?: FormWhereUniqueInput | FormWhereUniqueInput[]
    connect?: FormWhereUniqueInput | FormWhereUniqueInput[]
    update?: FormUpdateWithWhereUniqueWithoutUpdatedByInput | FormUpdateWithWhereUniqueWithoutUpdatedByInput[]
    updateMany?: FormUpdateManyWithWhereWithoutUpdatedByInput | FormUpdateManyWithWhereWithoutUpdatedByInput[]
    deleteMany?: FormScalarWhereInput | FormScalarWhereInput[]
  }

  export type OrganizationMemberUpdateManyWithoutUserNestedInput = {
    create?: XOR<OrganizationMemberCreateWithoutUserInput, OrganizationMemberUncheckedCreateWithoutUserInput> | OrganizationMemberCreateWithoutUserInput[] | OrganizationMemberUncheckedCreateWithoutUserInput[]
    connectOrCreate?: OrganizationMemberCreateOrConnectWithoutUserInput | OrganizationMemberCreateOrConnectWithoutUserInput[]
    upsert?: OrganizationMemberUpsertWithWhereUniqueWithoutUserInput | OrganizationMemberUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: OrganizationMemberCreateManyUserInputEnvelope
    set?: OrganizationMemberWhereUniqueInput | OrganizationMemberWhereUniqueInput[]
    disconnect?: OrganizationMemberWhereUniqueInput | OrganizationMemberWhereUniqueInput[]
    delete?: OrganizationMemberWhereUniqueInput | OrganizationMemberWhereUniqueInput[]
    connect?: OrganizationMemberWhereUniqueInput | OrganizationMemberWhereUniqueInput[]
    update?: OrganizationMemberUpdateWithWhereUniqueWithoutUserInput | OrganizationMemberUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: OrganizationMemberUpdateManyWithWhereWithoutUserInput | OrganizationMemberUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: OrganizationMemberScalarWhereInput | OrganizationMemberScalarWhereInput[]
  }

  export type OrganizationUpdateManyWithoutCreatedByNestedInput = {
    create?: XOR<OrganizationCreateWithoutCreatedByInput, OrganizationUncheckedCreateWithoutCreatedByInput> | OrganizationCreateWithoutCreatedByInput[] | OrganizationUncheckedCreateWithoutCreatedByInput[]
    connectOrCreate?: OrganizationCreateOrConnectWithoutCreatedByInput | OrganizationCreateOrConnectWithoutCreatedByInput[]
    upsert?: OrganizationUpsertWithWhereUniqueWithoutCreatedByInput | OrganizationUpsertWithWhereUniqueWithoutCreatedByInput[]
    createMany?: OrganizationCreateManyCreatedByInputEnvelope
    set?: OrganizationWhereUniqueInput | OrganizationWhereUniqueInput[]
    disconnect?: OrganizationWhereUniqueInput | OrganizationWhereUniqueInput[]
    delete?: OrganizationWhereUniqueInput | OrganizationWhereUniqueInput[]
    connect?: OrganizationWhereUniqueInput | OrganizationWhereUniqueInput[]
    update?: OrganizationUpdateWithWhereUniqueWithoutCreatedByInput | OrganizationUpdateWithWhereUniqueWithoutCreatedByInput[]
    updateMany?: OrganizationUpdateManyWithWhereWithoutCreatedByInput | OrganizationUpdateManyWithWhereWithoutCreatedByInput[]
    deleteMany?: OrganizationScalarWhereInput | OrganizationScalarWhereInput[]
  }

  export type SubscriptionUpdateOneWithoutUserNestedInput = {
    create?: XOR<SubscriptionCreateWithoutUserInput, SubscriptionUncheckedCreateWithoutUserInput>
    connectOrCreate?: SubscriptionCreateOrConnectWithoutUserInput
    upsert?: SubscriptionUpsertWithoutUserInput
    disconnect?: SubscriptionWhereInput | boolean
    delete?: SubscriptionWhereInput | boolean
    connect?: SubscriptionWhereUniqueInput
    update?: XOR<XOR<SubscriptionUpdateToOneWithWhereWithoutUserInput, SubscriptionUpdateWithoutUserInput>, SubscriptionUncheckedUpdateWithoutUserInput>
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type ClientUncheckedUpdateManyWithoutCreatedByNestedInput = {
    create?: XOR<ClientCreateWithoutCreatedByInput, ClientUncheckedCreateWithoutCreatedByInput> | ClientCreateWithoutCreatedByInput[] | ClientUncheckedCreateWithoutCreatedByInput[]
    connectOrCreate?: ClientCreateOrConnectWithoutCreatedByInput | ClientCreateOrConnectWithoutCreatedByInput[]
    upsert?: ClientUpsertWithWhereUniqueWithoutCreatedByInput | ClientUpsertWithWhereUniqueWithoutCreatedByInput[]
    createMany?: ClientCreateManyCreatedByInputEnvelope
    set?: ClientWhereUniqueInput | ClientWhereUniqueInput[]
    disconnect?: ClientWhereUniqueInput | ClientWhereUniqueInput[]
    delete?: ClientWhereUniqueInput | ClientWhereUniqueInput[]
    connect?: ClientWhereUniqueInput | ClientWhereUniqueInput[]
    update?: ClientUpdateWithWhereUniqueWithoutCreatedByInput | ClientUpdateWithWhereUniqueWithoutCreatedByInput[]
    updateMany?: ClientUpdateManyWithWhereWithoutCreatedByInput | ClientUpdateManyWithWhereWithoutCreatedByInput[]
    deleteMany?: ClientScalarWhereInput | ClientScalarWhereInput[]
  }

  export type FormUncheckedUpdateManyWithoutCreatedByNestedInput = {
    create?: XOR<FormCreateWithoutCreatedByInput, FormUncheckedCreateWithoutCreatedByInput> | FormCreateWithoutCreatedByInput[] | FormUncheckedCreateWithoutCreatedByInput[]
    connectOrCreate?: FormCreateOrConnectWithoutCreatedByInput | FormCreateOrConnectWithoutCreatedByInput[]
    upsert?: FormUpsertWithWhereUniqueWithoutCreatedByInput | FormUpsertWithWhereUniqueWithoutCreatedByInput[]
    createMany?: FormCreateManyCreatedByInputEnvelope
    set?: FormWhereUniqueInput | FormWhereUniqueInput[]
    disconnect?: FormWhereUniqueInput | FormWhereUniqueInput[]
    delete?: FormWhereUniqueInput | FormWhereUniqueInput[]
    connect?: FormWhereUniqueInput | FormWhereUniqueInput[]
    update?: FormUpdateWithWhereUniqueWithoutCreatedByInput | FormUpdateWithWhereUniqueWithoutCreatedByInput[]
    updateMany?: FormUpdateManyWithWhereWithoutCreatedByInput | FormUpdateManyWithWhereWithoutCreatedByInput[]
    deleteMany?: FormScalarWhereInput | FormScalarWhereInput[]
  }

  export type FormUncheckedUpdateManyWithoutUpdatedByNestedInput = {
    create?: XOR<FormCreateWithoutUpdatedByInput, FormUncheckedCreateWithoutUpdatedByInput> | FormCreateWithoutUpdatedByInput[] | FormUncheckedCreateWithoutUpdatedByInput[]
    connectOrCreate?: FormCreateOrConnectWithoutUpdatedByInput | FormCreateOrConnectWithoutUpdatedByInput[]
    upsert?: FormUpsertWithWhereUniqueWithoutUpdatedByInput | FormUpsertWithWhereUniqueWithoutUpdatedByInput[]
    createMany?: FormCreateManyUpdatedByInputEnvelope
    set?: FormWhereUniqueInput | FormWhereUniqueInput[]
    disconnect?: FormWhereUniqueInput | FormWhereUniqueInput[]
    delete?: FormWhereUniqueInput | FormWhereUniqueInput[]
    connect?: FormWhereUniqueInput | FormWhereUniqueInput[]
    update?: FormUpdateWithWhereUniqueWithoutUpdatedByInput | FormUpdateWithWhereUniqueWithoutUpdatedByInput[]
    updateMany?: FormUpdateManyWithWhereWithoutUpdatedByInput | FormUpdateManyWithWhereWithoutUpdatedByInput[]
    deleteMany?: FormScalarWhereInput | FormScalarWhereInput[]
  }

  export type OrganizationMemberUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<OrganizationMemberCreateWithoutUserInput, OrganizationMemberUncheckedCreateWithoutUserInput> | OrganizationMemberCreateWithoutUserInput[] | OrganizationMemberUncheckedCreateWithoutUserInput[]
    connectOrCreate?: OrganizationMemberCreateOrConnectWithoutUserInput | OrganizationMemberCreateOrConnectWithoutUserInput[]
    upsert?: OrganizationMemberUpsertWithWhereUniqueWithoutUserInput | OrganizationMemberUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: OrganizationMemberCreateManyUserInputEnvelope
    set?: OrganizationMemberWhereUniqueInput | OrganizationMemberWhereUniqueInput[]
    disconnect?: OrganizationMemberWhereUniqueInput | OrganizationMemberWhereUniqueInput[]
    delete?: OrganizationMemberWhereUniqueInput | OrganizationMemberWhereUniqueInput[]
    connect?: OrganizationMemberWhereUniqueInput | OrganizationMemberWhereUniqueInput[]
    update?: OrganizationMemberUpdateWithWhereUniqueWithoutUserInput | OrganizationMemberUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: OrganizationMemberUpdateManyWithWhereWithoutUserInput | OrganizationMemberUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: OrganizationMemberScalarWhereInput | OrganizationMemberScalarWhereInput[]
  }

  export type OrganizationUncheckedUpdateManyWithoutCreatedByNestedInput = {
    create?: XOR<OrganizationCreateWithoutCreatedByInput, OrganizationUncheckedCreateWithoutCreatedByInput> | OrganizationCreateWithoutCreatedByInput[] | OrganizationUncheckedCreateWithoutCreatedByInput[]
    connectOrCreate?: OrganizationCreateOrConnectWithoutCreatedByInput | OrganizationCreateOrConnectWithoutCreatedByInput[]
    upsert?: OrganizationUpsertWithWhereUniqueWithoutCreatedByInput | OrganizationUpsertWithWhereUniqueWithoutCreatedByInput[]
    createMany?: OrganizationCreateManyCreatedByInputEnvelope
    set?: OrganizationWhereUniqueInput | OrganizationWhereUniqueInput[]
    disconnect?: OrganizationWhereUniqueInput | OrganizationWhereUniqueInput[]
    delete?: OrganizationWhereUniqueInput | OrganizationWhereUniqueInput[]
    connect?: OrganizationWhereUniqueInput | OrganizationWhereUniqueInput[]
    update?: OrganizationUpdateWithWhereUniqueWithoutCreatedByInput | OrganizationUpdateWithWhereUniqueWithoutCreatedByInput[]
    updateMany?: OrganizationUpdateManyWithWhereWithoutCreatedByInput | OrganizationUpdateManyWithWhereWithoutCreatedByInput[]
    deleteMany?: OrganizationScalarWhereInput | OrganizationScalarWhereInput[]
  }

  export type SubscriptionUncheckedUpdateOneWithoutUserNestedInput = {
    create?: XOR<SubscriptionCreateWithoutUserInput, SubscriptionUncheckedCreateWithoutUserInput>
    connectOrCreate?: SubscriptionCreateOrConnectWithoutUserInput
    upsert?: SubscriptionUpsertWithoutUserInput
    disconnect?: SubscriptionWhereInput | boolean
    delete?: SubscriptionWhereInput | boolean
    connect?: SubscriptionWhereUniqueInput
    update?: XOR<XOR<SubscriptionUpdateToOneWithWhereWithoutUserInput, SubscriptionUpdateWithoutUserInput>, SubscriptionUncheckedUpdateWithoutUserInput>
  }

  export type UserCreateNestedOneWithoutSubscriptionInput = {
    create?: XOR<UserCreateWithoutSubscriptionInput, UserUncheckedCreateWithoutSubscriptionInput>
    connectOrCreate?: UserCreateOrConnectWithoutSubscriptionInput
    connect?: UserWhereUniqueInput
  }

  export type UserUpdateOneRequiredWithoutSubscriptionNestedInput = {
    create?: XOR<UserCreateWithoutSubscriptionInput, UserUncheckedCreateWithoutSubscriptionInput>
    connectOrCreate?: UserCreateOrConnectWithoutSubscriptionInput
    upsert?: UserUpsertWithoutSubscriptionInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutSubscriptionInput, UserUpdateWithoutSubscriptionInput>, UserUncheckedUpdateWithoutSubscriptionInput>
  }

  export type ClientCreateNestedManyWithoutOrganizationInput = {
    create?: XOR<ClientCreateWithoutOrganizationInput, ClientUncheckedCreateWithoutOrganizationInput> | ClientCreateWithoutOrganizationInput[] | ClientUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: ClientCreateOrConnectWithoutOrganizationInput | ClientCreateOrConnectWithoutOrganizationInput[]
    createMany?: ClientCreateManyOrganizationInputEnvelope
    connect?: ClientWhereUniqueInput | ClientWhereUniqueInput[]
  }

  export type FormCreateNestedManyWithoutOrganizationInput = {
    create?: XOR<FormCreateWithoutOrganizationInput, FormUncheckedCreateWithoutOrganizationInput> | FormCreateWithoutOrganizationInput[] | FormUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: FormCreateOrConnectWithoutOrganizationInput | FormCreateOrConnectWithoutOrganizationInput[]
    createMany?: FormCreateManyOrganizationInputEnvelope
    connect?: FormWhereUniqueInput | FormWhereUniqueInput[]
  }

  export type OrganizationMemberCreateNestedManyWithoutOrganizationInput = {
    create?: XOR<OrganizationMemberCreateWithoutOrganizationInput, OrganizationMemberUncheckedCreateWithoutOrganizationInput> | OrganizationMemberCreateWithoutOrganizationInput[] | OrganizationMemberUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: OrganizationMemberCreateOrConnectWithoutOrganizationInput | OrganizationMemberCreateOrConnectWithoutOrganizationInput[]
    createMany?: OrganizationMemberCreateManyOrganizationInputEnvelope
    connect?: OrganizationMemberWhereUniqueInput | OrganizationMemberWhereUniqueInput[]
  }

  export type UserCreateNestedOneWithoutCreatedOrganizationsInput = {
    create?: XOR<UserCreateWithoutCreatedOrganizationsInput, UserUncheckedCreateWithoutCreatedOrganizationsInput>
    connectOrCreate?: UserCreateOrConnectWithoutCreatedOrganizationsInput
    connect?: UserWhereUniqueInput
  }

  export type WorkerCreateNestedManyWithoutOrganizationInput = {
    create?: XOR<WorkerCreateWithoutOrganizationInput, WorkerUncheckedCreateWithoutOrganizationInput> | WorkerCreateWithoutOrganizationInput[] | WorkerUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: WorkerCreateOrConnectWithoutOrganizationInput | WorkerCreateOrConnectWithoutOrganizationInput[]
    createMany?: WorkerCreateManyOrganizationInputEnvelope
    connect?: WorkerWhereUniqueInput | WorkerWhereUniqueInput[]
  }

  export type ClientUncheckedCreateNestedManyWithoutOrganizationInput = {
    create?: XOR<ClientCreateWithoutOrganizationInput, ClientUncheckedCreateWithoutOrganizationInput> | ClientCreateWithoutOrganizationInput[] | ClientUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: ClientCreateOrConnectWithoutOrganizationInput | ClientCreateOrConnectWithoutOrganizationInput[]
    createMany?: ClientCreateManyOrganizationInputEnvelope
    connect?: ClientWhereUniqueInput | ClientWhereUniqueInput[]
  }

  export type FormUncheckedCreateNestedManyWithoutOrganizationInput = {
    create?: XOR<FormCreateWithoutOrganizationInput, FormUncheckedCreateWithoutOrganizationInput> | FormCreateWithoutOrganizationInput[] | FormUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: FormCreateOrConnectWithoutOrganizationInput | FormCreateOrConnectWithoutOrganizationInput[]
    createMany?: FormCreateManyOrganizationInputEnvelope
    connect?: FormWhereUniqueInput | FormWhereUniqueInput[]
  }

  export type OrganizationMemberUncheckedCreateNestedManyWithoutOrganizationInput = {
    create?: XOR<OrganizationMemberCreateWithoutOrganizationInput, OrganizationMemberUncheckedCreateWithoutOrganizationInput> | OrganizationMemberCreateWithoutOrganizationInput[] | OrganizationMemberUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: OrganizationMemberCreateOrConnectWithoutOrganizationInput | OrganizationMemberCreateOrConnectWithoutOrganizationInput[]
    createMany?: OrganizationMemberCreateManyOrganizationInputEnvelope
    connect?: OrganizationMemberWhereUniqueInput | OrganizationMemberWhereUniqueInput[]
  }

  export type WorkerUncheckedCreateNestedManyWithoutOrganizationInput = {
    create?: XOR<WorkerCreateWithoutOrganizationInput, WorkerUncheckedCreateWithoutOrganizationInput> | WorkerCreateWithoutOrganizationInput[] | WorkerUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: WorkerCreateOrConnectWithoutOrganizationInput | WorkerCreateOrConnectWithoutOrganizationInput[]
    createMany?: WorkerCreateManyOrganizationInputEnvelope
    connect?: WorkerWhereUniqueInput | WorkerWhereUniqueInput[]
  }

  export type EnumOrganizationTypeFieldUpdateOperationsInput = {
    set?: $Enums.OrganizationType
  }

  export type ClientUpdateManyWithoutOrganizationNestedInput = {
    create?: XOR<ClientCreateWithoutOrganizationInput, ClientUncheckedCreateWithoutOrganizationInput> | ClientCreateWithoutOrganizationInput[] | ClientUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: ClientCreateOrConnectWithoutOrganizationInput | ClientCreateOrConnectWithoutOrganizationInput[]
    upsert?: ClientUpsertWithWhereUniqueWithoutOrganizationInput | ClientUpsertWithWhereUniqueWithoutOrganizationInput[]
    createMany?: ClientCreateManyOrganizationInputEnvelope
    set?: ClientWhereUniqueInput | ClientWhereUniqueInput[]
    disconnect?: ClientWhereUniqueInput | ClientWhereUniqueInput[]
    delete?: ClientWhereUniqueInput | ClientWhereUniqueInput[]
    connect?: ClientWhereUniqueInput | ClientWhereUniqueInput[]
    update?: ClientUpdateWithWhereUniqueWithoutOrganizationInput | ClientUpdateWithWhereUniqueWithoutOrganizationInput[]
    updateMany?: ClientUpdateManyWithWhereWithoutOrganizationInput | ClientUpdateManyWithWhereWithoutOrganizationInput[]
    deleteMany?: ClientScalarWhereInput | ClientScalarWhereInput[]
  }

  export type FormUpdateManyWithoutOrganizationNestedInput = {
    create?: XOR<FormCreateWithoutOrganizationInput, FormUncheckedCreateWithoutOrganizationInput> | FormCreateWithoutOrganizationInput[] | FormUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: FormCreateOrConnectWithoutOrganizationInput | FormCreateOrConnectWithoutOrganizationInput[]
    upsert?: FormUpsertWithWhereUniqueWithoutOrganizationInput | FormUpsertWithWhereUniqueWithoutOrganizationInput[]
    createMany?: FormCreateManyOrganizationInputEnvelope
    set?: FormWhereUniqueInput | FormWhereUniqueInput[]
    disconnect?: FormWhereUniqueInput | FormWhereUniqueInput[]
    delete?: FormWhereUniqueInput | FormWhereUniqueInput[]
    connect?: FormWhereUniqueInput | FormWhereUniqueInput[]
    update?: FormUpdateWithWhereUniqueWithoutOrganizationInput | FormUpdateWithWhereUniqueWithoutOrganizationInput[]
    updateMany?: FormUpdateManyWithWhereWithoutOrganizationInput | FormUpdateManyWithWhereWithoutOrganizationInput[]
    deleteMany?: FormScalarWhereInput | FormScalarWhereInput[]
  }

  export type OrganizationMemberUpdateManyWithoutOrganizationNestedInput = {
    create?: XOR<OrganizationMemberCreateWithoutOrganizationInput, OrganizationMemberUncheckedCreateWithoutOrganizationInput> | OrganizationMemberCreateWithoutOrganizationInput[] | OrganizationMemberUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: OrganizationMemberCreateOrConnectWithoutOrganizationInput | OrganizationMemberCreateOrConnectWithoutOrganizationInput[]
    upsert?: OrganizationMemberUpsertWithWhereUniqueWithoutOrganizationInput | OrganizationMemberUpsertWithWhereUniqueWithoutOrganizationInput[]
    createMany?: OrganizationMemberCreateManyOrganizationInputEnvelope
    set?: OrganizationMemberWhereUniqueInput | OrganizationMemberWhereUniqueInput[]
    disconnect?: OrganizationMemberWhereUniqueInput | OrganizationMemberWhereUniqueInput[]
    delete?: OrganizationMemberWhereUniqueInput | OrganizationMemberWhereUniqueInput[]
    connect?: OrganizationMemberWhereUniqueInput | OrganizationMemberWhereUniqueInput[]
    update?: OrganizationMemberUpdateWithWhereUniqueWithoutOrganizationInput | OrganizationMemberUpdateWithWhereUniqueWithoutOrganizationInput[]
    updateMany?: OrganizationMemberUpdateManyWithWhereWithoutOrganizationInput | OrganizationMemberUpdateManyWithWhereWithoutOrganizationInput[]
    deleteMany?: OrganizationMemberScalarWhereInput | OrganizationMemberScalarWhereInput[]
  }

  export type UserUpdateOneRequiredWithoutCreatedOrganizationsNestedInput = {
    create?: XOR<UserCreateWithoutCreatedOrganizationsInput, UserUncheckedCreateWithoutCreatedOrganizationsInput>
    connectOrCreate?: UserCreateOrConnectWithoutCreatedOrganizationsInput
    upsert?: UserUpsertWithoutCreatedOrganizationsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutCreatedOrganizationsInput, UserUpdateWithoutCreatedOrganizationsInput>, UserUncheckedUpdateWithoutCreatedOrganizationsInput>
  }

  export type WorkerUpdateManyWithoutOrganizationNestedInput = {
    create?: XOR<WorkerCreateWithoutOrganizationInput, WorkerUncheckedCreateWithoutOrganizationInput> | WorkerCreateWithoutOrganizationInput[] | WorkerUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: WorkerCreateOrConnectWithoutOrganizationInput | WorkerCreateOrConnectWithoutOrganizationInput[]
    upsert?: WorkerUpsertWithWhereUniqueWithoutOrganizationInput | WorkerUpsertWithWhereUniqueWithoutOrganizationInput[]
    createMany?: WorkerCreateManyOrganizationInputEnvelope
    set?: WorkerWhereUniqueInput | WorkerWhereUniqueInput[]
    disconnect?: WorkerWhereUniqueInput | WorkerWhereUniqueInput[]
    delete?: WorkerWhereUniqueInput | WorkerWhereUniqueInput[]
    connect?: WorkerWhereUniqueInput | WorkerWhereUniqueInput[]
    update?: WorkerUpdateWithWhereUniqueWithoutOrganizationInput | WorkerUpdateWithWhereUniqueWithoutOrganizationInput[]
    updateMany?: WorkerUpdateManyWithWhereWithoutOrganizationInput | WorkerUpdateManyWithWhereWithoutOrganizationInput[]
    deleteMany?: WorkerScalarWhereInput | WorkerScalarWhereInput[]
  }

  export type ClientUncheckedUpdateManyWithoutOrganizationNestedInput = {
    create?: XOR<ClientCreateWithoutOrganizationInput, ClientUncheckedCreateWithoutOrganizationInput> | ClientCreateWithoutOrganizationInput[] | ClientUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: ClientCreateOrConnectWithoutOrganizationInput | ClientCreateOrConnectWithoutOrganizationInput[]
    upsert?: ClientUpsertWithWhereUniqueWithoutOrganizationInput | ClientUpsertWithWhereUniqueWithoutOrganizationInput[]
    createMany?: ClientCreateManyOrganizationInputEnvelope
    set?: ClientWhereUniqueInput | ClientWhereUniqueInput[]
    disconnect?: ClientWhereUniqueInput | ClientWhereUniqueInput[]
    delete?: ClientWhereUniqueInput | ClientWhereUniqueInput[]
    connect?: ClientWhereUniqueInput | ClientWhereUniqueInput[]
    update?: ClientUpdateWithWhereUniqueWithoutOrganizationInput | ClientUpdateWithWhereUniqueWithoutOrganizationInput[]
    updateMany?: ClientUpdateManyWithWhereWithoutOrganizationInput | ClientUpdateManyWithWhereWithoutOrganizationInput[]
    deleteMany?: ClientScalarWhereInput | ClientScalarWhereInput[]
  }

  export type FormUncheckedUpdateManyWithoutOrganizationNestedInput = {
    create?: XOR<FormCreateWithoutOrganizationInput, FormUncheckedCreateWithoutOrganizationInput> | FormCreateWithoutOrganizationInput[] | FormUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: FormCreateOrConnectWithoutOrganizationInput | FormCreateOrConnectWithoutOrganizationInput[]
    upsert?: FormUpsertWithWhereUniqueWithoutOrganizationInput | FormUpsertWithWhereUniqueWithoutOrganizationInput[]
    createMany?: FormCreateManyOrganizationInputEnvelope
    set?: FormWhereUniqueInput | FormWhereUniqueInput[]
    disconnect?: FormWhereUniqueInput | FormWhereUniqueInput[]
    delete?: FormWhereUniqueInput | FormWhereUniqueInput[]
    connect?: FormWhereUniqueInput | FormWhereUniqueInput[]
    update?: FormUpdateWithWhereUniqueWithoutOrganizationInput | FormUpdateWithWhereUniqueWithoutOrganizationInput[]
    updateMany?: FormUpdateManyWithWhereWithoutOrganizationInput | FormUpdateManyWithWhereWithoutOrganizationInput[]
    deleteMany?: FormScalarWhereInput | FormScalarWhereInput[]
  }

  export type OrganizationMemberUncheckedUpdateManyWithoutOrganizationNestedInput = {
    create?: XOR<OrganizationMemberCreateWithoutOrganizationInput, OrganizationMemberUncheckedCreateWithoutOrganizationInput> | OrganizationMemberCreateWithoutOrganizationInput[] | OrganizationMemberUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: OrganizationMemberCreateOrConnectWithoutOrganizationInput | OrganizationMemberCreateOrConnectWithoutOrganizationInput[]
    upsert?: OrganizationMemberUpsertWithWhereUniqueWithoutOrganizationInput | OrganizationMemberUpsertWithWhereUniqueWithoutOrganizationInput[]
    createMany?: OrganizationMemberCreateManyOrganizationInputEnvelope
    set?: OrganizationMemberWhereUniqueInput | OrganizationMemberWhereUniqueInput[]
    disconnect?: OrganizationMemberWhereUniqueInput | OrganizationMemberWhereUniqueInput[]
    delete?: OrganizationMemberWhereUniqueInput | OrganizationMemberWhereUniqueInput[]
    connect?: OrganizationMemberWhereUniqueInput | OrganizationMemberWhereUniqueInput[]
    update?: OrganizationMemberUpdateWithWhereUniqueWithoutOrganizationInput | OrganizationMemberUpdateWithWhereUniqueWithoutOrganizationInput[]
    updateMany?: OrganizationMemberUpdateManyWithWhereWithoutOrganizationInput | OrganizationMemberUpdateManyWithWhereWithoutOrganizationInput[]
    deleteMany?: OrganizationMemberScalarWhereInput | OrganizationMemberScalarWhereInput[]
  }

  export type WorkerUncheckedUpdateManyWithoutOrganizationNestedInput = {
    create?: XOR<WorkerCreateWithoutOrganizationInput, WorkerUncheckedCreateWithoutOrganizationInput> | WorkerCreateWithoutOrganizationInput[] | WorkerUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: WorkerCreateOrConnectWithoutOrganizationInput | WorkerCreateOrConnectWithoutOrganizationInput[]
    upsert?: WorkerUpsertWithWhereUniqueWithoutOrganizationInput | WorkerUpsertWithWhereUniqueWithoutOrganizationInput[]
    createMany?: WorkerCreateManyOrganizationInputEnvelope
    set?: WorkerWhereUniqueInput | WorkerWhereUniqueInput[]
    disconnect?: WorkerWhereUniqueInput | WorkerWhereUniqueInput[]
    delete?: WorkerWhereUniqueInput | WorkerWhereUniqueInput[]
    connect?: WorkerWhereUniqueInput | WorkerWhereUniqueInput[]
    update?: WorkerUpdateWithWhereUniqueWithoutOrganizationInput | WorkerUpdateWithWhereUniqueWithoutOrganizationInput[]
    updateMany?: WorkerUpdateManyWithWhereWithoutOrganizationInput | WorkerUpdateManyWithWhereWithoutOrganizationInput[]
    deleteMany?: WorkerScalarWhereInput | WorkerScalarWhereInput[]
  }

  export type OrganizationCreateNestedOneWithoutWorkersInput = {
    create?: XOR<OrganizationCreateWithoutWorkersInput, OrganizationUncheckedCreateWithoutWorkersInput>
    connectOrCreate?: OrganizationCreateOrConnectWithoutWorkersInput
    connect?: OrganizationWhereUniqueInput
  }

  export type EnumWorkerRoleFieldUpdateOperationsInput = {
    set?: $Enums.WorkerRole
  }

  export type OrganizationUpdateOneRequiredWithoutWorkersNestedInput = {
    create?: XOR<OrganizationCreateWithoutWorkersInput, OrganizationUncheckedCreateWithoutWorkersInput>
    connectOrCreate?: OrganizationCreateOrConnectWithoutWorkersInput
    upsert?: OrganizationUpsertWithoutWorkersInput
    connect?: OrganizationWhereUniqueInput
    update?: XOR<XOR<OrganizationUpdateToOneWithWhereWithoutWorkersInput, OrganizationUpdateWithoutWorkersInput>, OrganizationUncheckedUpdateWithoutWorkersInput>
  }

  export type OrganizationCreateNestedOneWithoutMembersInput = {
    create?: XOR<OrganizationCreateWithoutMembersInput, OrganizationUncheckedCreateWithoutMembersInput>
    connectOrCreate?: OrganizationCreateOrConnectWithoutMembersInput
    connect?: OrganizationWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutOrganizationsInput = {
    create?: XOR<UserCreateWithoutOrganizationsInput, UserUncheckedCreateWithoutOrganizationsInput>
    connectOrCreate?: UserCreateOrConnectWithoutOrganizationsInput
    connect?: UserWhereUniqueInput
  }

  export type EnumOrganizationRoleFieldUpdateOperationsInput = {
    set?: $Enums.OrganizationRole
  }

  export type OrganizationUpdateOneRequiredWithoutMembersNestedInput = {
    create?: XOR<OrganizationCreateWithoutMembersInput, OrganizationUncheckedCreateWithoutMembersInput>
    connectOrCreate?: OrganizationCreateOrConnectWithoutMembersInput
    upsert?: OrganizationUpsertWithoutMembersInput
    connect?: OrganizationWhereUniqueInput
    update?: XOR<XOR<OrganizationUpdateToOneWithWhereWithoutMembersInput, OrganizationUpdateWithoutMembersInput>, OrganizationUncheckedUpdateWithoutMembersInput>
  }

  export type UserUpdateOneRequiredWithoutOrganizationsNestedInput = {
    create?: XOR<UserCreateWithoutOrganizationsInput, UserUncheckedCreateWithoutOrganizationsInput>
    connectOrCreate?: UserCreateOrConnectWithoutOrganizationsInput
    upsert?: UserUpsertWithoutOrganizationsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutOrganizationsInput, UserUpdateWithoutOrganizationsInput>, UserUncheckedUpdateWithoutOrganizationsInput>
  }

  export type UserCreateNestedOneWithoutCreatedClientsInput = {
    create?: XOR<UserCreateWithoutCreatedClientsInput, UserUncheckedCreateWithoutCreatedClientsInput>
    connectOrCreate?: UserCreateOrConnectWithoutCreatedClientsInput
    connect?: UserWhereUniqueInput
  }

  export type OrganizationCreateNestedOneWithoutClientsInput = {
    create?: XOR<OrganizationCreateWithoutClientsInput, OrganizationUncheckedCreateWithoutClientsInput>
    connectOrCreate?: OrganizationCreateOrConnectWithoutClientsInput
    connect?: OrganizationWhereUniqueInput
  }

  export type FormCreateNestedManyWithoutClientInput = {
    create?: XOR<FormCreateWithoutClientInput, FormUncheckedCreateWithoutClientInput> | FormCreateWithoutClientInput[] | FormUncheckedCreateWithoutClientInput[]
    connectOrCreate?: FormCreateOrConnectWithoutClientInput | FormCreateOrConnectWithoutClientInput[]
    createMany?: FormCreateManyClientInputEnvelope
    connect?: FormWhereUniqueInput | FormWhereUniqueInput[]
  }

  export type FormUncheckedCreateNestedManyWithoutClientInput = {
    create?: XOR<FormCreateWithoutClientInput, FormUncheckedCreateWithoutClientInput> | FormCreateWithoutClientInput[] | FormUncheckedCreateWithoutClientInput[]
    connectOrCreate?: FormCreateOrConnectWithoutClientInput | FormCreateOrConnectWithoutClientInput[]
    createMany?: FormCreateManyClientInputEnvelope
    connect?: FormWhereUniqueInput | FormWhereUniqueInput[]
  }

  export type EnumClientTypeFieldUpdateOperationsInput = {
    set?: $Enums.ClientType
  }

  export type UserUpdateOneWithoutCreatedClientsNestedInput = {
    create?: XOR<UserCreateWithoutCreatedClientsInput, UserUncheckedCreateWithoutCreatedClientsInput>
    connectOrCreate?: UserCreateOrConnectWithoutCreatedClientsInput
    upsert?: UserUpsertWithoutCreatedClientsInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutCreatedClientsInput, UserUpdateWithoutCreatedClientsInput>, UserUncheckedUpdateWithoutCreatedClientsInput>
  }

  export type OrganizationUpdateOneWithoutClientsNestedInput = {
    create?: XOR<OrganizationCreateWithoutClientsInput, OrganizationUncheckedCreateWithoutClientsInput>
    connectOrCreate?: OrganizationCreateOrConnectWithoutClientsInput
    upsert?: OrganizationUpsertWithoutClientsInput
    disconnect?: OrganizationWhereInput | boolean
    delete?: OrganizationWhereInput | boolean
    connect?: OrganizationWhereUniqueInput
    update?: XOR<XOR<OrganizationUpdateToOneWithWhereWithoutClientsInput, OrganizationUpdateWithoutClientsInput>, OrganizationUncheckedUpdateWithoutClientsInput>
  }

  export type FormUpdateManyWithoutClientNestedInput = {
    create?: XOR<FormCreateWithoutClientInput, FormUncheckedCreateWithoutClientInput> | FormCreateWithoutClientInput[] | FormUncheckedCreateWithoutClientInput[]
    connectOrCreate?: FormCreateOrConnectWithoutClientInput | FormCreateOrConnectWithoutClientInput[]
    upsert?: FormUpsertWithWhereUniqueWithoutClientInput | FormUpsertWithWhereUniqueWithoutClientInput[]
    createMany?: FormCreateManyClientInputEnvelope
    set?: FormWhereUniqueInput | FormWhereUniqueInput[]
    disconnect?: FormWhereUniqueInput | FormWhereUniqueInput[]
    delete?: FormWhereUniqueInput | FormWhereUniqueInput[]
    connect?: FormWhereUniqueInput | FormWhereUniqueInput[]
    update?: FormUpdateWithWhereUniqueWithoutClientInput | FormUpdateWithWhereUniqueWithoutClientInput[]
    updateMany?: FormUpdateManyWithWhereWithoutClientInput | FormUpdateManyWithWhereWithoutClientInput[]
    deleteMany?: FormScalarWhereInput | FormScalarWhereInput[]
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type FormUncheckedUpdateManyWithoutClientNestedInput = {
    create?: XOR<FormCreateWithoutClientInput, FormUncheckedCreateWithoutClientInput> | FormCreateWithoutClientInput[] | FormUncheckedCreateWithoutClientInput[]
    connectOrCreate?: FormCreateOrConnectWithoutClientInput | FormCreateOrConnectWithoutClientInput[]
    upsert?: FormUpsertWithWhereUniqueWithoutClientInput | FormUpsertWithWhereUniqueWithoutClientInput[]
    createMany?: FormCreateManyClientInputEnvelope
    set?: FormWhereUniqueInput | FormWhereUniqueInput[]
    disconnect?: FormWhereUniqueInput | FormWhereUniqueInput[]
    delete?: FormWhereUniqueInput | FormWhereUniqueInput[]
    connect?: FormWhereUniqueInput | FormWhereUniqueInput[]
    update?: FormUpdateWithWhereUniqueWithoutClientInput | FormUpdateWithWhereUniqueWithoutClientInput[]
    updateMany?: FormUpdateManyWithWhereWithoutClientInput | FormUpdateManyWithWhereWithoutClientInput[]
    deleteMany?: FormScalarWhereInput | FormScalarWhereInput[]
  }

  export type FormAttachmentCreateNestedManyWithoutFormInput = {
    create?: XOR<FormAttachmentCreateWithoutFormInput, FormAttachmentUncheckedCreateWithoutFormInput> | FormAttachmentCreateWithoutFormInput[] | FormAttachmentUncheckedCreateWithoutFormInput[]
    connectOrCreate?: FormAttachmentCreateOrConnectWithoutFormInput | FormAttachmentCreateOrConnectWithoutFormInput[]
    createMany?: FormAttachmentCreateManyFormInputEnvelope
    connect?: FormAttachmentWhereUniqueInput | FormAttachmentWhereUniqueInput[]
  }

  export type FormVersionCreateNestedManyWithoutFormInput = {
    create?: XOR<FormVersionCreateWithoutFormInput, FormVersionUncheckedCreateWithoutFormInput> | FormVersionCreateWithoutFormInput[] | FormVersionUncheckedCreateWithoutFormInput[]
    connectOrCreate?: FormVersionCreateOrConnectWithoutFormInput | FormVersionCreateOrConnectWithoutFormInput[]
    createMany?: FormVersionCreateManyFormInputEnvelope
    connect?: FormVersionWhereUniqueInput | FormVersionWhereUniqueInput[]
  }

  export type ClientCreateNestedOneWithoutFormsInput = {
    create?: XOR<ClientCreateWithoutFormsInput, ClientUncheckedCreateWithoutFormsInput>
    connectOrCreate?: ClientCreateOrConnectWithoutFormsInput
    connect?: ClientWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutCreatedFormsInput = {
    create?: XOR<UserCreateWithoutCreatedFormsInput, UserUncheckedCreateWithoutCreatedFormsInput>
    connectOrCreate?: UserCreateOrConnectWithoutCreatedFormsInput
    connect?: UserWhereUniqueInput
  }

  export type OrganizationCreateNestedOneWithoutFormsInput = {
    create?: XOR<OrganizationCreateWithoutFormsInput, OrganizationUncheckedCreateWithoutFormsInput>
    connectOrCreate?: OrganizationCreateOrConnectWithoutFormsInput
    connect?: OrganizationWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutUpdatedFormsInput = {
    create?: XOR<UserCreateWithoutUpdatedFormsInput, UserUncheckedCreateWithoutUpdatedFormsInput>
    connectOrCreate?: UserCreateOrConnectWithoutUpdatedFormsInput
    connect?: UserWhereUniqueInput
  }

  export type FormAttachmentUncheckedCreateNestedManyWithoutFormInput = {
    create?: XOR<FormAttachmentCreateWithoutFormInput, FormAttachmentUncheckedCreateWithoutFormInput> | FormAttachmentCreateWithoutFormInput[] | FormAttachmentUncheckedCreateWithoutFormInput[]
    connectOrCreate?: FormAttachmentCreateOrConnectWithoutFormInput | FormAttachmentCreateOrConnectWithoutFormInput[]
    createMany?: FormAttachmentCreateManyFormInputEnvelope
    connect?: FormAttachmentWhereUniqueInput | FormAttachmentWhereUniqueInput[]
  }

  export type FormVersionUncheckedCreateNestedManyWithoutFormInput = {
    create?: XOR<FormVersionCreateWithoutFormInput, FormVersionUncheckedCreateWithoutFormInput> | FormVersionCreateWithoutFormInput[] | FormVersionUncheckedCreateWithoutFormInput[]
    connectOrCreate?: FormVersionCreateOrConnectWithoutFormInput | FormVersionCreateOrConnectWithoutFormInput[]
    createMany?: FormVersionCreateManyFormInputEnvelope
    connect?: FormVersionWhereUniqueInput | FormVersionWhereUniqueInput[]
  }

  export type Enumforms_typeFieldUpdateOperationsInput = {
    set?: $Enums.forms_type
  }

  export type EnumFormStatusFieldUpdateOperationsInput = {
    set?: $Enums.FormStatus
  }

  export type FormAttachmentUpdateManyWithoutFormNestedInput = {
    create?: XOR<FormAttachmentCreateWithoutFormInput, FormAttachmentUncheckedCreateWithoutFormInput> | FormAttachmentCreateWithoutFormInput[] | FormAttachmentUncheckedCreateWithoutFormInput[]
    connectOrCreate?: FormAttachmentCreateOrConnectWithoutFormInput | FormAttachmentCreateOrConnectWithoutFormInput[]
    upsert?: FormAttachmentUpsertWithWhereUniqueWithoutFormInput | FormAttachmentUpsertWithWhereUniqueWithoutFormInput[]
    createMany?: FormAttachmentCreateManyFormInputEnvelope
    set?: FormAttachmentWhereUniqueInput | FormAttachmentWhereUniqueInput[]
    disconnect?: FormAttachmentWhereUniqueInput | FormAttachmentWhereUniqueInput[]
    delete?: FormAttachmentWhereUniqueInput | FormAttachmentWhereUniqueInput[]
    connect?: FormAttachmentWhereUniqueInput | FormAttachmentWhereUniqueInput[]
    update?: FormAttachmentUpdateWithWhereUniqueWithoutFormInput | FormAttachmentUpdateWithWhereUniqueWithoutFormInput[]
    updateMany?: FormAttachmentUpdateManyWithWhereWithoutFormInput | FormAttachmentUpdateManyWithWhereWithoutFormInput[]
    deleteMany?: FormAttachmentScalarWhereInput | FormAttachmentScalarWhereInput[]
  }

  export type FormVersionUpdateManyWithoutFormNestedInput = {
    create?: XOR<FormVersionCreateWithoutFormInput, FormVersionUncheckedCreateWithoutFormInput> | FormVersionCreateWithoutFormInput[] | FormVersionUncheckedCreateWithoutFormInput[]
    connectOrCreate?: FormVersionCreateOrConnectWithoutFormInput | FormVersionCreateOrConnectWithoutFormInput[]
    upsert?: FormVersionUpsertWithWhereUniqueWithoutFormInput | FormVersionUpsertWithWhereUniqueWithoutFormInput[]
    createMany?: FormVersionCreateManyFormInputEnvelope
    set?: FormVersionWhereUniqueInput | FormVersionWhereUniqueInput[]
    disconnect?: FormVersionWhereUniqueInput | FormVersionWhereUniqueInput[]
    delete?: FormVersionWhereUniqueInput | FormVersionWhereUniqueInput[]
    connect?: FormVersionWhereUniqueInput | FormVersionWhereUniqueInput[]
    update?: FormVersionUpdateWithWhereUniqueWithoutFormInput | FormVersionUpdateWithWhereUniqueWithoutFormInput[]
    updateMany?: FormVersionUpdateManyWithWhereWithoutFormInput | FormVersionUpdateManyWithWhereWithoutFormInput[]
    deleteMany?: FormVersionScalarWhereInput | FormVersionScalarWhereInput[]
  }

  export type ClientUpdateOneWithoutFormsNestedInput = {
    create?: XOR<ClientCreateWithoutFormsInput, ClientUncheckedCreateWithoutFormsInput>
    connectOrCreate?: ClientCreateOrConnectWithoutFormsInput
    upsert?: ClientUpsertWithoutFormsInput
    disconnect?: ClientWhereInput | boolean
    delete?: ClientWhereInput | boolean
    connect?: ClientWhereUniqueInput
    update?: XOR<XOR<ClientUpdateToOneWithWhereWithoutFormsInput, ClientUpdateWithoutFormsInput>, ClientUncheckedUpdateWithoutFormsInput>
  }

  export type UserUpdateOneRequiredWithoutCreatedFormsNestedInput = {
    create?: XOR<UserCreateWithoutCreatedFormsInput, UserUncheckedCreateWithoutCreatedFormsInput>
    connectOrCreate?: UserCreateOrConnectWithoutCreatedFormsInput
    upsert?: UserUpsertWithoutCreatedFormsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutCreatedFormsInput, UserUpdateWithoutCreatedFormsInput>, UserUncheckedUpdateWithoutCreatedFormsInput>
  }

  export type OrganizationUpdateOneWithoutFormsNestedInput = {
    create?: XOR<OrganizationCreateWithoutFormsInput, OrganizationUncheckedCreateWithoutFormsInput>
    connectOrCreate?: OrganizationCreateOrConnectWithoutFormsInput
    upsert?: OrganizationUpsertWithoutFormsInput
    disconnect?: OrganizationWhereInput | boolean
    delete?: OrganizationWhereInput | boolean
    connect?: OrganizationWhereUniqueInput
    update?: XOR<XOR<OrganizationUpdateToOneWithWhereWithoutFormsInput, OrganizationUpdateWithoutFormsInput>, OrganizationUncheckedUpdateWithoutFormsInput>
  }

  export type UserUpdateOneWithoutUpdatedFormsNestedInput = {
    create?: XOR<UserCreateWithoutUpdatedFormsInput, UserUncheckedCreateWithoutUpdatedFormsInput>
    connectOrCreate?: UserCreateOrConnectWithoutUpdatedFormsInput
    upsert?: UserUpsertWithoutUpdatedFormsInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutUpdatedFormsInput, UserUpdateWithoutUpdatedFormsInput>, UserUncheckedUpdateWithoutUpdatedFormsInput>
  }

  export type FormAttachmentUncheckedUpdateManyWithoutFormNestedInput = {
    create?: XOR<FormAttachmentCreateWithoutFormInput, FormAttachmentUncheckedCreateWithoutFormInput> | FormAttachmentCreateWithoutFormInput[] | FormAttachmentUncheckedCreateWithoutFormInput[]
    connectOrCreate?: FormAttachmentCreateOrConnectWithoutFormInput | FormAttachmentCreateOrConnectWithoutFormInput[]
    upsert?: FormAttachmentUpsertWithWhereUniqueWithoutFormInput | FormAttachmentUpsertWithWhereUniqueWithoutFormInput[]
    createMany?: FormAttachmentCreateManyFormInputEnvelope
    set?: FormAttachmentWhereUniqueInput | FormAttachmentWhereUniqueInput[]
    disconnect?: FormAttachmentWhereUniqueInput | FormAttachmentWhereUniqueInput[]
    delete?: FormAttachmentWhereUniqueInput | FormAttachmentWhereUniqueInput[]
    connect?: FormAttachmentWhereUniqueInput | FormAttachmentWhereUniqueInput[]
    update?: FormAttachmentUpdateWithWhereUniqueWithoutFormInput | FormAttachmentUpdateWithWhereUniqueWithoutFormInput[]
    updateMany?: FormAttachmentUpdateManyWithWhereWithoutFormInput | FormAttachmentUpdateManyWithWhereWithoutFormInput[]
    deleteMany?: FormAttachmentScalarWhereInput | FormAttachmentScalarWhereInput[]
  }

  export type FormVersionUncheckedUpdateManyWithoutFormNestedInput = {
    create?: XOR<FormVersionCreateWithoutFormInput, FormVersionUncheckedCreateWithoutFormInput> | FormVersionCreateWithoutFormInput[] | FormVersionUncheckedCreateWithoutFormInput[]
    connectOrCreate?: FormVersionCreateOrConnectWithoutFormInput | FormVersionCreateOrConnectWithoutFormInput[]
    upsert?: FormVersionUpsertWithWhereUniqueWithoutFormInput | FormVersionUpsertWithWhereUniqueWithoutFormInput[]
    createMany?: FormVersionCreateManyFormInputEnvelope
    set?: FormVersionWhereUniqueInput | FormVersionWhereUniqueInput[]
    disconnect?: FormVersionWhereUniqueInput | FormVersionWhereUniqueInput[]
    delete?: FormVersionWhereUniqueInput | FormVersionWhereUniqueInput[]
    connect?: FormVersionWhereUniqueInput | FormVersionWhereUniqueInput[]
    update?: FormVersionUpdateWithWhereUniqueWithoutFormInput | FormVersionUpdateWithWhereUniqueWithoutFormInput[]
    updateMany?: FormVersionUpdateManyWithWhereWithoutFormInput | FormVersionUpdateManyWithWhereWithoutFormInput[]
    deleteMany?: FormVersionScalarWhereInput | FormVersionScalarWhereInput[]
  }

  export type FormCreateNestedOneWithoutVersionsInput = {
    create?: XOR<FormCreateWithoutVersionsInput, FormUncheckedCreateWithoutVersionsInput>
    connectOrCreate?: FormCreateOrConnectWithoutVersionsInput
    connect?: FormWhereUniqueInput
  }

  export type FormUpdateOneRequiredWithoutVersionsNestedInput = {
    create?: XOR<FormCreateWithoutVersionsInput, FormUncheckedCreateWithoutVersionsInput>
    connectOrCreate?: FormCreateOrConnectWithoutVersionsInput
    upsert?: FormUpsertWithoutVersionsInput
    connect?: FormWhereUniqueInput
    update?: XOR<XOR<FormUpdateToOneWithWhereWithoutVersionsInput, FormUpdateWithoutVersionsInput>, FormUncheckedUpdateWithoutVersionsInput>
  }

  export type FormCreateNestedOneWithoutAttachmentsInput = {
    create?: XOR<FormCreateWithoutAttachmentsInput, FormUncheckedCreateWithoutAttachmentsInput>
    connectOrCreate?: FormCreateOrConnectWithoutAttachmentsInput
    connect?: FormWhereUniqueInput
  }

  export type FormUpdateOneRequiredWithoutAttachmentsNestedInput = {
    create?: XOR<FormCreateWithoutAttachmentsInput, FormUncheckedCreateWithoutAttachmentsInput>
    connectOrCreate?: FormCreateOrConnectWithoutAttachmentsInput
    upsert?: FormUpsertWithoutAttachmentsInput
    connect?: FormWhereUniqueInput
    update?: XOR<XOR<FormUpdateToOneWithWhereWithoutAttachmentsInput, FormUpdateWithoutAttachmentsInput>, FormUncheckedUpdateWithoutAttachmentsInput>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedEnumusers_roleFilter<$PrismaModel = never> = {
    equals?: $Enums.users_role | Enumusers_roleFieldRefInput<$PrismaModel>
    in?: $Enums.users_role[]
    notIn?: $Enums.users_role[]
    not?: NestedEnumusers_roleFilter<$PrismaModel> | $Enums.users_role
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedEnumusers_roleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.users_role | Enumusers_roleFieldRefInput<$PrismaModel>
    in?: $Enums.users_role[]
    notIn?: $Enums.users_role[]
    not?: NestedEnumusers_roleWithAggregatesFilter<$PrismaModel> | $Enums.users_role
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumusers_roleFilter<$PrismaModel>
    _max?: NestedEnumusers_roleFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedEnumOrganizationTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.OrganizationType | EnumOrganizationTypeFieldRefInput<$PrismaModel>
    in?: $Enums.OrganizationType[]
    notIn?: $Enums.OrganizationType[]
    not?: NestedEnumOrganizationTypeFilter<$PrismaModel> | $Enums.OrganizationType
  }

  export type NestedEnumOrganizationTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.OrganizationType | EnumOrganizationTypeFieldRefInput<$PrismaModel>
    in?: $Enums.OrganizationType[]
    notIn?: $Enums.OrganizationType[]
    not?: NestedEnumOrganizationTypeWithAggregatesFilter<$PrismaModel> | $Enums.OrganizationType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumOrganizationTypeFilter<$PrismaModel>
    _max?: NestedEnumOrganizationTypeFilter<$PrismaModel>
  }

  export type NestedEnumWorkerRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.WorkerRole | EnumWorkerRoleFieldRefInput<$PrismaModel>
    in?: $Enums.WorkerRole[]
    notIn?: $Enums.WorkerRole[]
    not?: NestedEnumWorkerRoleFilter<$PrismaModel> | $Enums.WorkerRole
  }

  export type NestedEnumWorkerRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.WorkerRole | EnumWorkerRoleFieldRefInput<$PrismaModel>
    in?: $Enums.WorkerRole[]
    notIn?: $Enums.WorkerRole[]
    not?: NestedEnumWorkerRoleWithAggregatesFilter<$PrismaModel> | $Enums.WorkerRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumWorkerRoleFilter<$PrismaModel>
    _max?: NestedEnumWorkerRoleFilter<$PrismaModel>
  }

  export type NestedEnumOrganizationRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.OrganizationRole | EnumOrganizationRoleFieldRefInput<$PrismaModel>
    in?: $Enums.OrganizationRole[]
    notIn?: $Enums.OrganizationRole[]
    not?: NestedEnumOrganizationRoleFilter<$PrismaModel> | $Enums.OrganizationRole
  }

  export type NestedEnumOrganizationRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.OrganizationRole | EnumOrganizationRoleFieldRefInput<$PrismaModel>
    in?: $Enums.OrganizationRole[]
    notIn?: $Enums.OrganizationRole[]
    not?: NestedEnumOrganizationRoleWithAggregatesFilter<$PrismaModel> | $Enums.OrganizationRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumOrganizationRoleFilter<$PrismaModel>
    _max?: NestedEnumOrganizationRoleFilter<$PrismaModel>
  }

  export type NestedEnumClientTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.ClientType | EnumClientTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ClientType[]
    notIn?: $Enums.ClientType[]
    not?: NestedEnumClientTypeFilter<$PrismaModel> | $Enums.ClientType
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumClientTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ClientType | EnumClientTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ClientType[]
    notIn?: $Enums.ClientType[]
    not?: NestedEnumClientTypeWithAggregatesFilter<$PrismaModel> | $Enums.ClientType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumClientTypeFilter<$PrismaModel>
    _max?: NestedEnumClientTypeFilter<$PrismaModel>
  }

  export type NestedEnumforms_typeFilter<$PrismaModel = never> = {
    equals?: $Enums.forms_type | Enumforms_typeFieldRefInput<$PrismaModel>
    in?: $Enums.forms_type[]
    notIn?: $Enums.forms_type[]
    not?: NestedEnumforms_typeFilter<$PrismaModel> | $Enums.forms_type
  }

  export type NestedEnumFormStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.FormStatus | EnumFormStatusFieldRefInput<$PrismaModel>
    in?: $Enums.FormStatus[]
    notIn?: $Enums.FormStatus[]
    not?: NestedEnumFormStatusFilter<$PrismaModel> | $Enums.FormStatus
  }

  export type NestedEnumforms_typeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.forms_type | Enumforms_typeFieldRefInput<$PrismaModel>
    in?: $Enums.forms_type[]
    notIn?: $Enums.forms_type[]
    not?: NestedEnumforms_typeWithAggregatesFilter<$PrismaModel> | $Enums.forms_type
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumforms_typeFilter<$PrismaModel>
    _max?: NestedEnumforms_typeFilter<$PrismaModel>
  }

  export type NestedEnumFormStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.FormStatus | EnumFormStatusFieldRefInput<$PrismaModel>
    in?: $Enums.FormStatus[]
    notIn?: $Enums.FormStatus[]
    not?: NestedEnumFormStatusWithAggregatesFilter<$PrismaModel> | $Enums.FormStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumFormStatusFilter<$PrismaModel>
    _max?: NestedEnumFormStatusFilter<$PrismaModel>
  }

  export type ClientCreateWithoutCreatedByInput = {
    type?: $Enums.ClientType
    firstName?: string | null
    lastName?: string | null
    companyName?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    jmbg?: string | null
    taxNumber?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    amortizacijaOnly?: boolean
    idCardNumber?: string | null
    organization?: OrganizationCreateNestedOneWithoutClientsInput
    forms?: FormCreateNestedManyWithoutClientInput
  }

  export type ClientUncheckedCreateWithoutCreatedByInput = {
    id?: number
    organizationId?: number | null
    type?: $Enums.ClientType
    firstName?: string | null
    lastName?: string | null
    companyName?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    jmbg?: string | null
    taxNumber?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    amortizacijaOnly?: boolean
    idCardNumber?: string | null
    forms?: FormUncheckedCreateNestedManyWithoutClientInput
  }

  export type ClientCreateOrConnectWithoutCreatedByInput = {
    where: ClientWhereUniqueInput
    create: XOR<ClientCreateWithoutCreatedByInput, ClientUncheckedCreateWithoutCreatedByInput>
  }

  export type ClientCreateManyCreatedByInputEnvelope = {
    data: ClientCreateManyCreatedByInput | ClientCreateManyCreatedByInput[]
    skipDuplicates?: boolean
  }

  export type FormCreateWithoutCreatedByInput = {
    type: $Enums.forms_type
    status?: $Enums.FormStatus
    year: number
    month?: number | null
    title?: string | null
    pdfUrl?: string | null
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    attachments?: FormAttachmentCreateNestedManyWithoutFormInput
    versions?: FormVersionCreateNestedManyWithoutFormInput
    client?: ClientCreateNestedOneWithoutFormsInput
    organization?: OrganizationCreateNestedOneWithoutFormsInput
    updatedBy?: UserCreateNestedOneWithoutUpdatedFormsInput
  }

  export type FormUncheckedCreateWithoutCreatedByInput = {
    id?: number
    type: $Enums.forms_type
    status?: $Enums.FormStatus
    year: number
    month?: number | null
    title?: string | null
    organizationId?: number | null
    clientId?: number | null
    updatedById?: number | null
    pdfUrl?: string | null
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    attachments?: FormAttachmentUncheckedCreateNestedManyWithoutFormInput
    versions?: FormVersionUncheckedCreateNestedManyWithoutFormInput
  }

  export type FormCreateOrConnectWithoutCreatedByInput = {
    where: FormWhereUniqueInput
    create: XOR<FormCreateWithoutCreatedByInput, FormUncheckedCreateWithoutCreatedByInput>
  }

  export type FormCreateManyCreatedByInputEnvelope = {
    data: FormCreateManyCreatedByInput | FormCreateManyCreatedByInput[]
    skipDuplicates?: boolean
  }

  export type FormCreateWithoutUpdatedByInput = {
    type: $Enums.forms_type
    status?: $Enums.FormStatus
    year: number
    month?: number | null
    title?: string | null
    pdfUrl?: string | null
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    attachments?: FormAttachmentCreateNestedManyWithoutFormInput
    versions?: FormVersionCreateNestedManyWithoutFormInput
    client?: ClientCreateNestedOneWithoutFormsInput
    createdBy: UserCreateNestedOneWithoutCreatedFormsInput
    organization?: OrganizationCreateNestedOneWithoutFormsInput
  }

  export type FormUncheckedCreateWithoutUpdatedByInput = {
    id?: number
    type: $Enums.forms_type
    status?: $Enums.FormStatus
    year: number
    month?: number | null
    title?: string | null
    organizationId?: number | null
    clientId?: number | null
    createdById: number
    pdfUrl?: string | null
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    attachments?: FormAttachmentUncheckedCreateNestedManyWithoutFormInput
    versions?: FormVersionUncheckedCreateNestedManyWithoutFormInput
  }

  export type FormCreateOrConnectWithoutUpdatedByInput = {
    where: FormWhereUniqueInput
    create: XOR<FormCreateWithoutUpdatedByInput, FormUncheckedCreateWithoutUpdatedByInput>
  }

  export type FormCreateManyUpdatedByInputEnvelope = {
    data: FormCreateManyUpdatedByInput | FormCreateManyUpdatedByInput[]
    skipDuplicates?: boolean
  }

  export type OrganizationMemberCreateWithoutUserInput = {
    role?: $Enums.OrganizationRole
    joinedAt?: Date | string
    organization: OrganizationCreateNestedOneWithoutMembersInput
  }

  export type OrganizationMemberUncheckedCreateWithoutUserInput = {
    id?: number
    organizationId: number
    role?: $Enums.OrganizationRole
    joinedAt?: Date | string
  }

  export type OrganizationMemberCreateOrConnectWithoutUserInput = {
    where: OrganizationMemberWhereUniqueInput
    create: XOR<OrganizationMemberCreateWithoutUserInput, OrganizationMemberUncheckedCreateWithoutUserInput>
  }

  export type OrganizationMemberCreateManyUserInputEnvelope = {
    data: OrganizationMemberCreateManyUserInput | OrganizationMemberCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type OrganizationCreateWithoutCreatedByInput = {
    name: string
    taxNumber?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    type?: $Enums.OrganizationType
    activityCode?: string | null
    activityName?: string | null
    isClientOrg?: boolean
    clients?: ClientCreateNestedManyWithoutOrganizationInput
    forms?: FormCreateNestedManyWithoutOrganizationInput
    members?: OrganizationMemberCreateNestedManyWithoutOrganizationInput
    workers?: WorkerCreateNestedManyWithoutOrganizationInput
  }

  export type OrganizationUncheckedCreateWithoutCreatedByInput = {
    id?: number
    name: string
    taxNumber?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    type?: $Enums.OrganizationType
    activityCode?: string | null
    activityName?: string | null
    isClientOrg?: boolean
    clients?: ClientUncheckedCreateNestedManyWithoutOrganizationInput
    forms?: FormUncheckedCreateNestedManyWithoutOrganizationInput
    members?: OrganizationMemberUncheckedCreateNestedManyWithoutOrganizationInput
    workers?: WorkerUncheckedCreateNestedManyWithoutOrganizationInput
  }

  export type OrganizationCreateOrConnectWithoutCreatedByInput = {
    where: OrganizationWhereUniqueInput
    create: XOR<OrganizationCreateWithoutCreatedByInput, OrganizationUncheckedCreateWithoutCreatedByInput>
  }

  export type OrganizationCreateManyCreatedByInputEnvelope = {
    data: OrganizationCreateManyCreatedByInput | OrganizationCreateManyCreatedByInput[]
    skipDuplicates?: boolean
  }

  export type SubscriptionCreateWithoutUserInput = {
    startDate: Date | string
    endDate: Date | string
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SubscriptionUncheckedCreateWithoutUserInput = {
    id?: number
    startDate: Date | string
    endDate: Date | string
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SubscriptionCreateOrConnectWithoutUserInput = {
    where: SubscriptionWhereUniqueInput
    create: XOR<SubscriptionCreateWithoutUserInput, SubscriptionUncheckedCreateWithoutUserInput>
  }

  export type ClientUpsertWithWhereUniqueWithoutCreatedByInput = {
    where: ClientWhereUniqueInput
    update: XOR<ClientUpdateWithoutCreatedByInput, ClientUncheckedUpdateWithoutCreatedByInput>
    create: XOR<ClientCreateWithoutCreatedByInput, ClientUncheckedCreateWithoutCreatedByInput>
  }

  export type ClientUpdateWithWhereUniqueWithoutCreatedByInput = {
    where: ClientWhereUniqueInput
    data: XOR<ClientUpdateWithoutCreatedByInput, ClientUncheckedUpdateWithoutCreatedByInput>
  }

  export type ClientUpdateManyWithWhereWithoutCreatedByInput = {
    where: ClientScalarWhereInput
    data: XOR<ClientUpdateManyMutationInput, ClientUncheckedUpdateManyWithoutCreatedByInput>
  }

  export type ClientScalarWhereInput = {
    AND?: ClientScalarWhereInput | ClientScalarWhereInput[]
    OR?: ClientScalarWhereInput[]
    NOT?: ClientScalarWhereInput | ClientScalarWhereInput[]
    id?: IntFilter<"Client"> | number
    organizationId?: IntNullableFilter<"Client"> | number | null
    type?: EnumClientTypeFilter<"Client"> | $Enums.ClientType
    firstName?: StringNullableFilter<"Client"> | string | null
    lastName?: StringNullableFilter<"Client"> | string | null
    companyName?: StringNullableFilter<"Client"> | string | null
    email?: StringNullableFilter<"Client"> | string | null
    phone?: StringNullableFilter<"Client"> | string | null
    address?: StringNullableFilter<"Client"> | string | null
    jmbg?: StringNullableFilter<"Client"> | string | null
    taxNumber?: StringNullableFilter<"Client"> | string | null
    createdAt?: DateTimeFilter<"Client"> | Date | string
    updatedAt?: DateTimeFilter<"Client"> | Date | string
    createdById?: IntNullableFilter<"Client"> | number | null
    amortizacijaOnly?: BoolFilter<"Client"> | boolean
    idCardNumber?: StringNullableFilter<"Client"> | string | null
  }

  export type FormUpsertWithWhereUniqueWithoutCreatedByInput = {
    where: FormWhereUniqueInput
    update: XOR<FormUpdateWithoutCreatedByInput, FormUncheckedUpdateWithoutCreatedByInput>
    create: XOR<FormCreateWithoutCreatedByInput, FormUncheckedCreateWithoutCreatedByInput>
  }

  export type FormUpdateWithWhereUniqueWithoutCreatedByInput = {
    where: FormWhereUniqueInput
    data: XOR<FormUpdateWithoutCreatedByInput, FormUncheckedUpdateWithoutCreatedByInput>
  }

  export type FormUpdateManyWithWhereWithoutCreatedByInput = {
    where: FormScalarWhereInput
    data: XOR<FormUpdateManyMutationInput, FormUncheckedUpdateManyWithoutCreatedByInput>
  }

  export type FormScalarWhereInput = {
    AND?: FormScalarWhereInput | FormScalarWhereInput[]
    OR?: FormScalarWhereInput[]
    NOT?: FormScalarWhereInput | FormScalarWhereInput[]
    id?: IntFilter<"Form"> | number
    type?: Enumforms_typeFilter<"Form"> | $Enums.forms_type
    status?: EnumFormStatusFilter<"Form"> | $Enums.FormStatus
    year?: IntFilter<"Form"> | number
    month?: IntNullableFilter<"Form"> | number | null
    title?: StringNullableFilter<"Form"> | string | null
    organizationId?: IntNullableFilter<"Form"> | number | null
    clientId?: IntNullableFilter<"Form"> | number | null
    createdById?: IntFilter<"Form"> | number
    updatedById?: IntNullableFilter<"Form"> | number | null
    pdfUrl?: StringNullableFilter<"Form"> | string | null
    notes?: StringNullableFilter<"Form"> | string | null
    createdAt?: DateTimeFilter<"Form"> | Date | string
    updatedAt?: DateTimeFilter<"Form"> | Date | string
  }

  export type FormUpsertWithWhereUniqueWithoutUpdatedByInput = {
    where: FormWhereUniqueInput
    update: XOR<FormUpdateWithoutUpdatedByInput, FormUncheckedUpdateWithoutUpdatedByInput>
    create: XOR<FormCreateWithoutUpdatedByInput, FormUncheckedCreateWithoutUpdatedByInput>
  }

  export type FormUpdateWithWhereUniqueWithoutUpdatedByInput = {
    where: FormWhereUniqueInput
    data: XOR<FormUpdateWithoutUpdatedByInput, FormUncheckedUpdateWithoutUpdatedByInput>
  }

  export type FormUpdateManyWithWhereWithoutUpdatedByInput = {
    where: FormScalarWhereInput
    data: XOR<FormUpdateManyMutationInput, FormUncheckedUpdateManyWithoutUpdatedByInput>
  }

  export type OrganizationMemberUpsertWithWhereUniqueWithoutUserInput = {
    where: OrganizationMemberWhereUniqueInput
    update: XOR<OrganizationMemberUpdateWithoutUserInput, OrganizationMemberUncheckedUpdateWithoutUserInput>
    create: XOR<OrganizationMemberCreateWithoutUserInput, OrganizationMemberUncheckedCreateWithoutUserInput>
  }

  export type OrganizationMemberUpdateWithWhereUniqueWithoutUserInput = {
    where: OrganizationMemberWhereUniqueInput
    data: XOR<OrganizationMemberUpdateWithoutUserInput, OrganizationMemberUncheckedUpdateWithoutUserInput>
  }

  export type OrganizationMemberUpdateManyWithWhereWithoutUserInput = {
    where: OrganizationMemberScalarWhereInput
    data: XOR<OrganizationMemberUpdateManyMutationInput, OrganizationMemberUncheckedUpdateManyWithoutUserInput>
  }

  export type OrganizationMemberScalarWhereInput = {
    AND?: OrganizationMemberScalarWhereInput | OrganizationMemberScalarWhereInput[]
    OR?: OrganizationMemberScalarWhereInput[]
    NOT?: OrganizationMemberScalarWhereInput | OrganizationMemberScalarWhereInput[]
    id?: IntFilter<"OrganizationMember"> | number
    organizationId?: IntFilter<"OrganizationMember"> | number
    userId?: IntFilter<"OrganizationMember"> | number
    role?: EnumOrganizationRoleFilter<"OrganizationMember"> | $Enums.OrganizationRole
    joinedAt?: DateTimeFilter<"OrganizationMember"> | Date | string
  }

  export type OrganizationUpsertWithWhereUniqueWithoutCreatedByInput = {
    where: OrganizationWhereUniqueInput
    update: XOR<OrganizationUpdateWithoutCreatedByInput, OrganizationUncheckedUpdateWithoutCreatedByInput>
    create: XOR<OrganizationCreateWithoutCreatedByInput, OrganizationUncheckedCreateWithoutCreatedByInput>
  }

  export type OrganizationUpdateWithWhereUniqueWithoutCreatedByInput = {
    where: OrganizationWhereUniqueInput
    data: XOR<OrganizationUpdateWithoutCreatedByInput, OrganizationUncheckedUpdateWithoutCreatedByInput>
  }

  export type OrganizationUpdateManyWithWhereWithoutCreatedByInput = {
    where: OrganizationScalarWhereInput
    data: XOR<OrganizationUpdateManyMutationInput, OrganizationUncheckedUpdateManyWithoutCreatedByInput>
  }

  export type OrganizationScalarWhereInput = {
    AND?: OrganizationScalarWhereInput | OrganizationScalarWhereInput[]
    OR?: OrganizationScalarWhereInput[]
    NOT?: OrganizationScalarWhereInput | OrganizationScalarWhereInput[]
    id?: IntFilter<"Organization"> | number
    name?: StringFilter<"Organization"> | string
    taxNumber?: StringNullableFilter<"Organization"> | string | null
    email?: StringNullableFilter<"Organization"> | string | null
    phone?: StringNullableFilter<"Organization"> | string | null
    address?: StringNullableFilter<"Organization"> | string | null
    createdAt?: DateTimeFilter<"Organization"> | Date | string
    updatedAt?: DateTimeFilter<"Organization"> | Date | string
    createdById?: IntFilter<"Organization"> | number
    type?: EnumOrganizationTypeFilter<"Organization"> | $Enums.OrganizationType
    activityCode?: StringNullableFilter<"Organization"> | string | null
    activityName?: StringNullableFilter<"Organization"> | string | null
    isClientOrg?: BoolFilter<"Organization"> | boolean
  }

  export type SubscriptionUpsertWithoutUserInput = {
    update: XOR<SubscriptionUpdateWithoutUserInput, SubscriptionUncheckedUpdateWithoutUserInput>
    create: XOR<SubscriptionCreateWithoutUserInput, SubscriptionUncheckedCreateWithoutUserInput>
    where?: SubscriptionWhereInput
  }

  export type SubscriptionUpdateToOneWithWhereWithoutUserInput = {
    where?: SubscriptionWhereInput
    data: XOR<SubscriptionUpdateWithoutUserInput, SubscriptionUncheckedUpdateWithoutUserInput>
  }

  export type SubscriptionUpdateWithoutUserInput = {
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SubscriptionUncheckedUpdateWithoutUserInput = {
    id?: IntFieldUpdateOperationsInput | number
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserCreateWithoutSubscriptionInput = {
    googleId?: string | null
    email?: string | null
    password?: string | null
    firstName: string
    lastName: string
    phone?: string | null
    address?: string | null
    role?: $Enums.users_role
    createdAt?: Date | string
    updatedAt?: Date | string
    jmbg?: string | null
    passwordResetToken?: string | null
    passwordResetTokenExpiry?: Date | string | null
    emailVerificationExpiry?: Date | string | null
    emailVerificationToken?: string | null
    isEmailVerified?: boolean
    idCardNumber?: string | null
    createdClients?: ClientCreateNestedManyWithoutCreatedByInput
    createdForms?: FormCreateNestedManyWithoutCreatedByInput
    updatedForms?: FormCreateNestedManyWithoutUpdatedByInput
    organizations?: OrganizationMemberCreateNestedManyWithoutUserInput
    createdOrganizations?: OrganizationCreateNestedManyWithoutCreatedByInput
  }

  export type UserUncheckedCreateWithoutSubscriptionInput = {
    id?: number
    googleId?: string | null
    email?: string | null
    password?: string | null
    firstName: string
    lastName: string
    phone?: string | null
    address?: string | null
    role?: $Enums.users_role
    createdAt?: Date | string
    updatedAt?: Date | string
    jmbg?: string | null
    passwordResetToken?: string | null
    passwordResetTokenExpiry?: Date | string | null
    emailVerificationExpiry?: Date | string | null
    emailVerificationToken?: string | null
    isEmailVerified?: boolean
    idCardNumber?: string | null
    createdClients?: ClientUncheckedCreateNestedManyWithoutCreatedByInput
    createdForms?: FormUncheckedCreateNestedManyWithoutCreatedByInput
    updatedForms?: FormUncheckedCreateNestedManyWithoutUpdatedByInput
    organizations?: OrganizationMemberUncheckedCreateNestedManyWithoutUserInput
    createdOrganizations?: OrganizationUncheckedCreateNestedManyWithoutCreatedByInput
  }

  export type UserCreateOrConnectWithoutSubscriptionInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutSubscriptionInput, UserUncheckedCreateWithoutSubscriptionInput>
  }

  export type UserUpsertWithoutSubscriptionInput = {
    update: XOR<UserUpdateWithoutSubscriptionInput, UserUncheckedUpdateWithoutSubscriptionInput>
    create: XOR<UserCreateWithoutSubscriptionInput, UserUncheckedCreateWithoutSubscriptionInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutSubscriptionInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutSubscriptionInput, UserUncheckedUpdateWithoutSubscriptionInput>
  }

  export type UserUpdateWithoutSubscriptionInput = {
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    role?: Enumusers_roleFieldUpdateOperationsInput | $Enums.users_role
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetToken?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetTokenExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdClients?: ClientUpdateManyWithoutCreatedByNestedInput
    createdForms?: FormUpdateManyWithoutCreatedByNestedInput
    updatedForms?: FormUpdateManyWithoutUpdatedByNestedInput
    organizations?: OrganizationMemberUpdateManyWithoutUserNestedInput
    createdOrganizations?: OrganizationUpdateManyWithoutCreatedByNestedInput
  }

  export type UserUncheckedUpdateWithoutSubscriptionInput = {
    id?: IntFieldUpdateOperationsInput | number
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    role?: Enumusers_roleFieldUpdateOperationsInput | $Enums.users_role
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetToken?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetTokenExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdClients?: ClientUncheckedUpdateManyWithoutCreatedByNestedInput
    createdForms?: FormUncheckedUpdateManyWithoutCreatedByNestedInput
    updatedForms?: FormUncheckedUpdateManyWithoutUpdatedByNestedInput
    organizations?: OrganizationMemberUncheckedUpdateManyWithoutUserNestedInput
    createdOrganizations?: OrganizationUncheckedUpdateManyWithoutCreatedByNestedInput
  }

  export type ClientCreateWithoutOrganizationInput = {
    type?: $Enums.ClientType
    firstName?: string | null
    lastName?: string | null
    companyName?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    jmbg?: string | null
    taxNumber?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    amortizacijaOnly?: boolean
    idCardNumber?: string | null
    createdBy?: UserCreateNestedOneWithoutCreatedClientsInput
    forms?: FormCreateNestedManyWithoutClientInput
  }

  export type ClientUncheckedCreateWithoutOrganizationInput = {
    id?: number
    type?: $Enums.ClientType
    firstName?: string | null
    lastName?: string | null
    companyName?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    jmbg?: string | null
    taxNumber?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    createdById?: number | null
    amortizacijaOnly?: boolean
    idCardNumber?: string | null
    forms?: FormUncheckedCreateNestedManyWithoutClientInput
  }

  export type ClientCreateOrConnectWithoutOrganizationInput = {
    where: ClientWhereUniqueInput
    create: XOR<ClientCreateWithoutOrganizationInput, ClientUncheckedCreateWithoutOrganizationInput>
  }

  export type ClientCreateManyOrganizationInputEnvelope = {
    data: ClientCreateManyOrganizationInput | ClientCreateManyOrganizationInput[]
    skipDuplicates?: boolean
  }

  export type FormCreateWithoutOrganizationInput = {
    type: $Enums.forms_type
    status?: $Enums.FormStatus
    year: number
    month?: number | null
    title?: string | null
    pdfUrl?: string | null
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    attachments?: FormAttachmentCreateNestedManyWithoutFormInput
    versions?: FormVersionCreateNestedManyWithoutFormInput
    client?: ClientCreateNestedOneWithoutFormsInput
    createdBy: UserCreateNestedOneWithoutCreatedFormsInput
    updatedBy?: UserCreateNestedOneWithoutUpdatedFormsInput
  }

  export type FormUncheckedCreateWithoutOrganizationInput = {
    id?: number
    type: $Enums.forms_type
    status?: $Enums.FormStatus
    year: number
    month?: number | null
    title?: string | null
    clientId?: number | null
    createdById: number
    updatedById?: number | null
    pdfUrl?: string | null
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    attachments?: FormAttachmentUncheckedCreateNestedManyWithoutFormInput
    versions?: FormVersionUncheckedCreateNestedManyWithoutFormInput
  }

  export type FormCreateOrConnectWithoutOrganizationInput = {
    where: FormWhereUniqueInput
    create: XOR<FormCreateWithoutOrganizationInput, FormUncheckedCreateWithoutOrganizationInput>
  }

  export type FormCreateManyOrganizationInputEnvelope = {
    data: FormCreateManyOrganizationInput | FormCreateManyOrganizationInput[]
    skipDuplicates?: boolean
  }

  export type OrganizationMemberCreateWithoutOrganizationInput = {
    role?: $Enums.OrganizationRole
    joinedAt?: Date | string
    user: UserCreateNestedOneWithoutOrganizationsInput
  }

  export type OrganizationMemberUncheckedCreateWithoutOrganizationInput = {
    id?: number
    userId: number
    role?: $Enums.OrganizationRole
    joinedAt?: Date | string
  }

  export type OrganizationMemberCreateOrConnectWithoutOrganizationInput = {
    where: OrganizationMemberWhereUniqueInput
    create: XOR<OrganizationMemberCreateWithoutOrganizationInput, OrganizationMemberUncheckedCreateWithoutOrganizationInput>
  }

  export type OrganizationMemberCreateManyOrganizationInputEnvelope = {
    data: OrganizationMemberCreateManyOrganizationInput | OrganizationMemberCreateManyOrganizationInput[]
    skipDuplicates?: boolean
  }

  export type UserCreateWithoutCreatedOrganizationsInput = {
    googleId?: string | null
    email?: string | null
    password?: string | null
    firstName: string
    lastName: string
    phone?: string | null
    address?: string | null
    role?: $Enums.users_role
    createdAt?: Date | string
    updatedAt?: Date | string
    jmbg?: string | null
    passwordResetToken?: string | null
    passwordResetTokenExpiry?: Date | string | null
    emailVerificationExpiry?: Date | string | null
    emailVerificationToken?: string | null
    isEmailVerified?: boolean
    idCardNumber?: string | null
    createdClients?: ClientCreateNestedManyWithoutCreatedByInput
    createdForms?: FormCreateNestedManyWithoutCreatedByInput
    updatedForms?: FormCreateNestedManyWithoutUpdatedByInput
    organizations?: OrganizationMemberCreateNestedManyWithoutUserInput
    subscription?: SubscriptionCreateNestedOneWithoutUserInput
  }

  export type UserUncheckedCreateWithoutCreatedOrganizationsInput = {
    id?: number
    googleId?: string | null
    email?: string | null
    password?: string | null
    firstName: string
    lastName: string
    phone?: string | null
    address?: string | null
    role?: $Enums.users_role
    createdAt?: Date | string
    updatedAt?: Date | string
    jmbg?: string | null
    passwordResetToken?: string | null
    passwordResetTokenExpiry?: Date | string | null
    emailVerificationExpiry?: Date | string | null
    emailVerificationToken?: string | null
    isEmailVerified?: boolean
    idCardNumber?: string | null
    createdClients?: ClientUncheckedCreateNestedManyWithoutCreatedByInput
    createdForms?: FormUncheckedCreateNestedManyWithoutCreatedByInput
    updatedForms?: FormUncheckedCreateNestedManyWithoutUpdatedByInput
    organizations?: OrganizationMemberUncheckedCreateNestedManyWithoutUserInput
    subscription?: SubscriptionUncheckedCreateNestedOneWithoutUserInput
  }

  export type UserCreateOrConnectWithoutCreatedOrganizationsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutCreatedOrganizationsInput, UserUncheckedCreateWithoutCreatedOrganizationsInput>
  }

  export type WorkerCreateWithoutOrganizationInput = {
    firstName: string
    lastName: string
    jmbg?: string | null
    startDate?: Date | string | null
    endDate?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    address?: string | null
    email?: string | null
    phone?: string | null
    role?: $Enums.WorkerRole
    idCardNumber?: string | null
  }

  export type WorkerUncheckedCreateWithoutOrganizationInput = {
    id?: number
    firstName: string
    lastName: string
    jmbg?: string | null
    startDate?: Date | string | null
    endDate?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    address?: string | null
    email?: string | null
    phone?: string | null
    role?: $Enums.WorkerRole
    idCardNumber?: string | null
  }

  export type WorkerCreateOrConnectWithoutOrganizationInput = {
    where: WorkerWhereUniqueInput
    create: XOR<WorkerCreateWithoutOrganizationInput, WorkerUncheckedCreateWithoutOrganizationInput>
  }

  export type WorkerCreateManyOrganizationInputEnvelope = {
    data: WorkerCreateManyOrganizationInput | WorkerCreateManyOrganizationInput[]
    skipDuplicates?: boolean
  }

  export type ClientUpsertWithWhereUniqueWithoutOrganizationInput = {
    where: ClientWhereUniqueInput
    update: XOR<ClientUpdateWithoutOrganizationInput, ClientUncheckedUpdateWithoutOrganizationInput>
    create: XOR<ClientCreateWithoutOrganizationInput, ClientUncheckedCreateWithoutOrganizationInput>
  }

  export type ClientUpdateWithWhereUniqueWithoutOrganizationInput = {
    where: ClientWhereUniqueInput
    data: XOR<ClientUpdateWithoutOrganizationInput, ClientUncheckedUpdateWithoutOrganizationInput>
  }

  export type ClientUpdateManyWithWhereWithoutOrganizationInput = {
    where: ClientScalarWhereInput
    data: XOR<ClientUpdateManyMutationInput, ClientUncheckedUpdateManyWithoutOrganizationInput>
  }

  export type FormUpsertWithWhereUniqueWithoutOrganizationInput = {
    where: FormWhereUniqueInput
    update: XOR<FormUpdateWithoutOrganizationInput, FormUncheckedUpdateWithoutOrganizationInput>
    create: XOR<FormCreateWithoutOrganizationInput, FormUncheckedCreateWithoutOrganizationInput>
  }

  export type FormUpdateWithWhereUniqueWithoutOrganizationInput = {
    where: FormWhereUniqueInput
    data: XOR<FormUpdateWithoutOrganizationInput, FormUncheckedUpdateWithoutOrganizationInput>
  }

  export type FormUpdateManyWithWhereWithoutOrganizationInput = {
    where: FormScalarWhereInput
    data: XOR<FormUpdateManyMutationInput, FormUncheckedUpdateManyWithoutOrganizationInput>
  }

  export type OrganizationMemberUpsertWithWhereUniqueWithoutOrganizationInput = {
    where: OrganizationMemberWhereUniqueInput
    update: XOR<OrganizationMemberUpdateWithoutOrganizationInput, OrganizationMemberUncheckedUpdateWithoutOrganizationInput>
    create: XOR<OrganizationMemberCreateWithoutOrganizationInput, OrganizationMemberUncheckedCreateWithoutOrganizationInput>
  }

  export type OrganizationMemberUpdateWithWhereUniqueWithoutOrganizationInput = {
    where: OrganizationMemberWhereUniqueInput
    data: XOR<OrganizationMemberUpdateWithoutOrganizationInput, OrganizationMemberUncheckedUpdateWithoutOrganizationInput>
  }

  export type OrganizationMemberUpdateManyWithWhereWithoutOrganizationInput = {
    where: OrganizationMemberScalarWhereInput
    data: XOR<OrganizationMemberUpdateManyMutationInput, OrganizationMemberUncheckedUpdateManyWithoutOrganizationInput>
  }

  export type UserUpsertWithoutCreatedOrganizationsInput = {
    update: XOR<UserUpdateWithoutCreatedOrganizationsInput, UserUncheckedUpdateWithoutCreatedOrganizationsInput>
    create: XOR<UserCreateWithoutCreatedOrganizationsInput, UserUncheckedCreateWithoutCreatedOrganizationsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutCreatedOrganizationsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutCreatedOrganizationsInput, UserUncheckedUpdateWithoutCreatedOrganizationsInput>
  }

  export type UserUpdateWithoutCreatedOrganizationsInput = {
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    role?: Enumusers_roleFieldUpdateOperationsInput | $Enums.users_role
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetToken?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetTokenExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdClients?: ClientUpdateManyWithoutCreatedByNestedInput
    createdForms?: FormUpdateManyWithoutCreatedByNestedInput
    updatedForms?: FormUpdateManyWithoutUpdatedByNestedInput
    organizations?: OrganizationMemberUpdateManyWithoutUserNestedInput
    subscription?: SubscriptionUpdateOneWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutCreatedOrganizationsInput = {
    id?: IntFieldUpdateOperationsInput | number
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    role?: Enumusers_roleFieldUpdateOperationsInput | $Enums.users_role
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetToken?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetTokenExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdClients?: ClientUncheckedUpdateManyWithoutCreatedByNestedInput
    createdForms?: FormUncheckedUpdateManyWithoutCreatedByNestedInput
    updatedForms?: FormUncheckedUpdateManyWithoutUpdatedByNestedInput
    organizations?: OrganizationMemberUncheckedUpdateManyWithoutUserNestedInput
    subscription?: SubscriptionUncheckedUpdateOneWithoutUserNestedInput
  }

  export type WorkerUpsertWithWhereUniqueWithoutOrganizationInput = {
    where: WorkerWhereUniqueInput
    update: XOR<WorkerUpdateWithoutOrganizationInput, WorkerUncheckedUpdateWithoutOrganizationInput>
    create: XOR<WorkerCreateWithoutOrganizationInput, WorkerUncheckedCreateWithoutOrganizationInput>
  }

  export type WorkerUpdateWithWhereUniqueWithoutOrganizationInput = {
    where: WorkerWhereUniqueInput
    data: XOR<WorkerUpdateWithoutOrganizationInput, WorkerUncheckedUpdateWithoutOrganizationInput>
  }

  export type WorkerUpdateManyWithWhereWithoutOrganizationInput = {
    where: WorkerScalarWhereInput
    data: XOR<WorkerUpdateManyMutationInput, WorkerUncheckedUpdateManyWithoutOrganizationInput>
  }

  export type WorkerScalarWhereInput = {
    AND?: WorkerScalarWhereInput | WorkerScalarWhereInput[]
    OR?: WorkerScalarWhereInput[]
    NOT?: WorkerScalarWhereInput | WorkerScalarWhereInput[]
    id?: IntFilter<"Worker"> | number
    organizationId?: IntFilter<"Worker"> | number
    firstName?: StringFilter<"Worker"> | string
    lastName?: StringFilter<"Worker"> | string
    jmbg?: StringNullableFilter<"Worker"> | string | null
    startDate?: DateTimeNullableFilter<"Worker"> | Date | string | null
    endDate?: DateTimeNullableFilter<"Worker"> | Date | string | null
    createdAt?: DateTimeFilter<"Worker"> | Date | string
    updatedAt?: DateTimeFilter<"Worker"> | Date | string
    address?: StringNullableFilter<"Worker"> | string | null
    email?: StringNullableFilter<"Worker"> | string | null
    phone?: StringNullableFilter<"Worker"> | string | null
    role?: EnumWorkerRoleFilter<"Worker"> | $Enums.WorkerRole
    idCardNumber?: StringNullableFilter<"Worker"> | string | null
  }

  export type OrganizationCreateWithoutWorkersInput = {
    name: string
    taxNumber?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    type?: $Enums.OrganizationType
    activityCode?: string | null
    activityName?: string | null
    isClientOrg?: boolean
    clients?: ClientCreateNestedManyWithoutOrganizationInput
    forms?: FormCreateNestedManyWithoutOrganizationInput
    members?: OrganizationMemberCreateNestedManyWithoutOrganizationInput
    createdBy: UserCreateNestedOneWithoutCreatedOrganizationsInput
  }

  export type OrganizationUncheckedCreateWithoutWorkersInput = {
    id?: number
    name: string
    taxNumber?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    createdById: number
    type?: $Enums.OrganizationType
    activityCode?: string | null
    activityName?: string | null
    isClientOrg?: boolean
    clients?: ClientUncheckedCreateNestedManyWithoutOrganizationInput
    forms?: FormUncheckedCreateNestedManyWithoutOrganizationInput
    members?: OrganizationMemberUncheckedCreateNestedManyWithoutOrganizationInput
  }

  export type OrganizationCreateOrConnectWithoutWorkersInput = {
    where: OrganizationWhereUniqueInput
    create: XOR<OrganizationCreateWithoutWorkersInput, OrganizationUncheckedCreateWithoutWorkersInput>
  }

  export type OrganizationUpsertWithoutWorkersInput = {
    update: XOR<OrganizationUpdateWithoutWorkersInput, OrganizationUncheckedUpdateWithoutWorkersInput>
    create: XOR<OrganizationCreateWithoutWorkersInput, OrganizationUncheckedCreateWithoutWorkersInput>
    where?: OrganizationWhereInput
  }

  export type OrganizationUpdateToOneWithWhereWithoutWorkersInput = {
    where?: OrganizationWhereInput
    data: XOR<OrganizationUpdateWithoutWorkersInput, OrganizationUncheckedUpdateWithoutWorkersInput>
  }

  export type OrganizationUpdateWithoutWorkersInput = {
    name?: StringFieldUpdateOperationsInput | string
    taxNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    type?: EnumOrganizationTypeFieldUpdateOperationsInput | $Enums.OrganizationType
    activityCode?: NullableStringFieldUpdateOperationsInput | string | null
    activityName?: NullableStringFieldUpdateOperationsInput | string | null
    isClientOrg?: BoolFieldUpdateOperationsInput | boolean
    clients?: ClientUpdateManyWithoutOrganizationNestedInput
    forms?: FormUpdateManyWithoutOrganizationNestedInput
    members?: OrganizationMemberUpdateManyWithoutOrganizationNestedInput
    createdBy?: UserUpdateOneRequiredWithoutCreatedOrganizationsNestedInput
  }

  export type OrganizationUncheckedUpdateWithoutWorkersInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    taxNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdById?: IntFieldUpdateOperationsInput | number
    type?: EnumOrganizationTypeFieldUpdateOperationsInput | $Enums.OrganizationType
    activityCode?: NullableStringFieldUpdateOperationsInput | string | null
    activityName?: NullableStringFieldUpdateOperationsInput | string | null
    isClientOrg?: BoolFieldUpdateOperationsInput | boolean
    clients?: ClientUncheckedUpdateManyWithoutOrganizationNestedInput
    forms?: FormUncheckedUpdateManyWithoutOrganizationNestedInput
    members?: OrganizationMemberUncheckedUpdateManyWithoutOrganizationNestedInput
  }

  export type OrganizationCreateWithoutMembersInput = {
    name: string
    taxNumber?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    type?: $Enums.OrganizationType
    activityCode?: string | null
    activityName?: string | null
    isClientOrg?: boolean
    clients?: ClientCreateNestedManyWithoutOrganizationInput
    forms?: FormCreateNestedManyWithoutOrganizationInput
    createdBy: UserCreateNestedOneWithoutCreatedOrganizationsInput
    workers?: WorkerCreateNestedManyWithoutOrganizationInput
  }

  export type OrganizationUncheckedCreateWithoutMembersInput = {
    id?: number
    name: string
    taxNumber?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    createdById: number
    type?: $Enums.OrganizationType
    activityCode?: string | null
    activityName?: string | null
    isClientOrg?: boolean
    clients?: ClientUncheckedCreateNestedManyWithoutOrganizationInput
    forms?: FormUncheckedCreateNestedManyWithoutOrganizationInput
    workers?: WorkerUncheckedCreateNestedManyWithoutOrganizationInput
  }

  export type OrganizationCreateOrConnectWithoutMembersInput = {
    where: OrganizationWhereUniqueInput
    create: XOR<OrganizationCreateWithoutMembersInput, OrganizationUncheckedCreateWithoutMembersInput>
  }

  export type UserCreateWithoutOrganizationsInput = {
    googleId?: string | null
    email?: string | null
    password?: string | null
    firstName: string
    lastName: string
    phone?: string | null
    address?: string | null
    role?: $Enums.users_role
    createdAt?: Date | string
    updatedAt?: Date | string
    jmbg?: string | null
    passwordResetToken?: string | null
    passwordResetTokenExpiry?: Date | string | null
    emailVerificationExpiry?: Date | string | null
    emailVerificationToken?: string | null
    isEmailVerified?: boolean
    idCardNumber?: string | null
    createdClients?: ClientCreateNestedManyWithoutCreatedByInput
    createdForms?: FormCreateNestedManyWithoutCreatedByInput
    updatedForms?: FormCreateNestedManyWithoutUpdatedByInput
    createdOrganizations?: OrganizationCreateNestedManyWithoutCreatedByInput
    subscription?: SubscriptionCreateNestedOneWithoutUserInput
  }

  export type UserUncheckedCreateWithoutOrganizationsInput = {
    id?: number
    googleId?: string | null
    email?: string | null
    password?: string | null
    firstName: string
    lastName: string
    phone?: string | null
    address?: string | null
    role?: $Enums.users_role
    createdAt?: Date | string
    updatedAt?: Date | string
    jmbg?: string | null
    passwordResetToken?: string | null
    passwordResetTokenExpiry?: Date | string | null
    emailVerificationExpiry?: Date | string | null
    emailVerificationToken?: string | null
    isEmailVerified?: boolean
    idCardNumber?: string | null
    createdClients?: ClientUncheckedCreateNestedManyWithoutCreatedByInput
    createdForms?: FormUncheckedCreateNestedManyWithoutCreatedByInput
    updatedForms?: FormUncheckedCreateNestedManyWithoutUpdatedByInput
    createdOrganizations?: OrganizationUncheckedCreateNestedManyWithoutCreatedByInput
    subscription?: SubscriptionUncheckedCreateNestedOneWithoutUserInput
  }

  export type UserCreateOrConnectWithoutOrganizationsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutOrganizationsInput, UserUncheckedCreateWithoutOrganizationsInput>
  }

  export type OrganizationUpsertWithoutMembersInput = {
    update: XOR<OrganizationUpdateWithoutMembersInput, OrganizationUncheckedUpdateWithoutMembersInput>
    create: XOR<OrganizationCreateWithoutMembersInput, OrganizationUncheckedCreateWithoutMembersInput>
    where?: OrganizationWhereInput
  }

  export type OrganizationUpdateToOneWithWhereWithoutMembersInput = {
    where?: OrganizationWhereInput
    data: XOR<OrganizationUpdateWithoutMembersInput, OrganizationUncheckedUpdateWithoutMembersInput>
  }

  export type OrganizationUpdateWithoutMembersInput = {
    name?: StringFieldUpdateOperationsInput | string
    taxNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    type?: EnumOrganizationTypeFieldUpdateOperationsInput | $Enums.OrganizationType
    activityCode?: NullableStringFieldUpdateOperationsInput | string | null
    activityName?: NullableStringFieldUpdateOperationsInput | string | null
    isClientOrg?: BoolFieldUpdateOperationsInput | boolean
    clients?: ClientUpdateManyWithoutOrganizationNestedInput
    forms?: FormUpdateManyWithoutOrganizationNestedInput
    createdBy?: UserUpdateOneRequiredWithoutCreatedOrganizationsNestedInput
    workers?: WorkerUpdateManyWithoutOrganizationNestedInput
  }

  export type OrganizationUncheckedUpdateWithoutMembersInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    taxNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdById?: IntFieldUpdateOperationsInput | number
    type?: EnumOrganizationTypeFieldUpdateOperationsInput | $Enums.OrganizationType
    activityCode?: NullableStringFieldUpdateOperationsInput | string | null
    activityName?: NullableStringFieldUpdateOperationsInput | string | null
    isClientOrg?: BoolFieldUpdateOperationsInput | boolean
    clients?: ClientUncheckedUpdateManyWithoutOrganizationNestedInput
    forms?: FormUncheckedUpdateManyWithoutOrganizationNestedInput
    workers?: WorkerUncheckedUpdateManyWithoutOrganizationNestedInput
  }

  export type UserUpsertWithoutOrganizationsInput = {
    update: XOR<UserUpdateWithoutOrganizationsInput, UserUncheckedUpdateWithoutOrganizationsInput>
    create: XOR<UserCreateWithoutOrganizationsInput, UserUncheckedCreateWithoutOrganizationsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutOrganizationsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutOrganizationsInput, UserUncheckedUpdateWithoutOrganizationsInput>
  }

  export type UserUpdateWithoutOrganizationsInput = {
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    role?: Enumusers_roleFieldUpdateOperationsInput | $Enums.users_role
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetToken?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetTokenExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdClients?: ClientUpdateManyWithoutCreatedByNestedInput
    createdForms?: FormUpdateManyWithoutCreatedByNestedInput
    updatedForms?: FormUpdateManyWithoutUpdatedByNestedInput
    createdOrganizations?: OrganizationUpdateManyWithoutCreatedByNestedInput
    subscription?: SubscriptionUpdateOneWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutOrganizationsInput = {
    id?: IntFieldUpdateOperationsInput | number
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    role?: Enumusers_roleFieldUpdateOperationsInput | $Enums.users_role
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetToken?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetTokenExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdClients?: ClientUncheckedUpdateManyWithoutCreatedByNestedInput
    createdForms?: FormUncheckedUpdateManyWithoutCreatedByNestedInput
    updatedForms?: FormUncheckedUpdateManyWithoutUpdatedByNestedInput
    createdOrganizations?: OrganizationUncheckedUpdateManyWithoutCreatedByNestedInput
    subscription?: SubscriptionUncheckedUpdateOneWithoutUserNestedInput
  }

  export type UserCreateWithoutCreatedClientsInput = {
    googleId?: string | null
    email?: string | null
    password?: string | null
    firstName: string
    lastName: string
    phone?: string | null
    address?: string | null
    role?: $Enums.users_role
    createdAt?: Date | string
    updatedAt?: Date | string
    jmbg?: string | null
    passwordResetToken?: string | null
    passwordResetTokenExpiry?: Date | string | null
    emailVerificationExpiry?: Date | string | null
    emailVerificationToken?: string | null
    isEmailVerified?: boolean
    idCardNumber?: string | null
    createdForms?: FormCreateNestedManyWithoutCreatedByInput
    updatedForms?: FormCreateNestedManyWithoutUpdatedByInput
    organizations?: OrganizationMemberCreateNestedManyWithoutUserInput
    createdOrganizations?: OrganizationCreateNestedManyWithoutCreatedByInput
    subscription?: SubscriptionCreateNestedOneWithoutUserInput
  }

  export type UserUncheckedCreateWithoutCreatedClientsInput = {
    id?: number
    googleId?: string | null
    email?: string | null
    password?: string | null
    firstName: string
    lastName: string
    phone?: string | null
    address?: string | null
    role?: $Enums.users_role
    createdAt?: Date | string
    updatedAt?: Date | string
    jmbg?: string | null
    passwordResetToken?: string | null
    passwordResetTokenExpiry?: Date | string | null
    emailVerificationExpiry?: Date | string | null
    emailVerificationToken?: string | null
    isEmailVerified?: boolean
    idCardNumber?: string | null
    createdForms?: FormUncheckedCreateNestedManyWithoutCreatedByInput
    updatedForms?: FormUncheckedCreateNestedManyWithoutUpdatedByInput
    organizations?: OrganizationMemberUncheckedCreateNestedManyWithoutUserInput
    createdOrganizations?: OrganizationUncheckedCreateNestedManyWithoutCreatedByInput
    subscription?: SubscriptionUncheckedCreateNestedOneWithoutUserInput
  }

  export type UserCreateOrConnectWithoutCreatedClientsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutCreatedClientsInput, UserUncheckedCreateWithoutCreatedClientsInput>
  }

  export type OrganizationCreateWithoutClientsInput = {
    name: string
    taxNumber?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    type?: $Enums.OrganizationType
    activityCode?: string | null
    activityName?: string | null
    isClientOrg?: boolean
    forms?: FormCreateNestedManyWithoutOrganizationInput
    members?: OrganizationMemberCreateNestedManyWithoutOrganizationInput
    createdBy: UserCreateNestedOneWithoutCreatedOrganizationsInput
    workers?: WorkerCreateNestedManyWithoutOrganizationInput
  }

  export type OrganizationUncheckedCreateWithoutClientsInput = {
    id?: number
    name: string
    taxNumber?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    createdById: number
    type?: $Enums.OrganizationType
    activityCode?: string | null
    activityName?: string | null
    isClientOrg?: boolean
    forms?: FormUncheckedCreateNestedManyWithoutOrganizationInput
    members?: OrganizationMemberUncheckedCreateNestedManyWithoutOrganizationInput
    workers?: WorkerUncheckedCreateNestedManyWithoutOrganizationInput
  }

  export type OrganizationCreateOrConnectWithoutClientsInput = {
    where: OrganizationWhereUniqueInput
    create: XOR<OrganizationCreateWithoutClientsInput, OrganizationUncheckedCreateWithoutClientsInput>
  }

  export type FormCreateWithoutClientInput = {
    type: $Enums.forms_type
    status?: $Enums.FormStatus
    year: number
    month?: number | null
    title?: string | null
    pdfUrl?: string | null
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    attachments?: FormAttachmentCreateNestedManyWithoutFormInput
    versions?: FormVersionCreateNestedManyWithoutFormInput
    createdBy: UserCreateNestedOneWithoutCreatedFormsInput
    organization?: OrganizationCreateNestedOneWithoutFormsInput
    updatedBy?: UserCreateNestedOneWithoutUpdatedFormsInput
  }

  export type FormUncheckedCreateWithoutClientInput = {
    id?: number
    type: $Enums.forms_type
    status?: $Enums.FormStatus
    year: number
    month?: number | null
    title?: string | null
    organizationId?: number | null
    createdById: number
    updatedById?: number | null
    pdfUrl?: string | null
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    attachments?: FormAttachmentUncheckedCreateNestedManyWithoutFormInput
    versions?: FormVersionUncheckedCreateNestedManyWithoutFormInput
  }

  export type FormCreateOrConnectWithoutClientInput = {
    where: FormWhereUniqueInput
    create: XOR<FormCreateWithoutClientInput, FormUncheckedCreateWithoutClientInput>
  }

  export type FormCreateManyClientInputEnvelope = {
    data: FormCreateManyClientInput | FormCreateManyClientInput[]
    skipDuplicates?: boolean
  }

  export type UserUpsertWithoutCreatedClientsInput = {
    update: XOR<UserUpdateWithoutCreatedClientsInput, UserUncheckedUpdateWithoutCreatedClientsInput>
    create: XOR<UserCreateWithoutCreatedClientsInput, UserUncheckedCreateWithoutCreatedClientsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutCreatedClientsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutCreatedClientsInput, UserUncheckedUpdateWithoutCreatedClientsInput>
  }

  export type UserUpdateWithoutCreatedClientsInput = {
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    role?: Enumusers_roleFieldUpdateOperationsInput | $Enums.users_role
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetToken?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetTokenExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdForms?: FormUpdateManyWithoutCreatedByNestedInput
    updatedForms?: FormUpdateManyWithoutUpdatedByNestedInput
    organizations?: OrganizationMemberUpdateManyWithoutUserNestedInput
    createdOrganizations?: OrganizationUpdateManyWithoutCreatedByNestedInput
    subscription?: SubscriptionUpdateOneWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutCreatedClientsInput = {
    id?: IntFieldUpdateOperationsInput | number
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    role?: Enumusers_roleFieldUpdateOperationsInput | $Enums.users_role
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetToken?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetTokenExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdForms?: FormUncheckedUpdateManyWithoutCreatedByNestedInput
    updatedForms?: FormUncheckedUpdateManyWithoutUpdatedByNestedInput
    organizations?: OrganizationMemberUncheckedUpdateManyWithoutUserNestedInput
    createdOrganizations?: OrganizationUncheckedUpdateManyWithoutCreatedByNestedInput
    subscription?: SubscriptionUncheckedUpdateOneWithoutUserNestedInput
  }

  export type OrganizationUpsertWithoutClientsInput = {
    update: XOR<OrganizationUpdateWithoutClientsInput, OrganizationUncheckedUpdateWithoutClientsInput>
    create: XOR<OrganizationCreateWithoutClientsInput, OrganizationUncheckedCreateWithoutClientsInput>
    where?: OrganizationWhereInput
  }

  export type OrganizationUpdateToOneWithWhereWithoutClientsInput = {
    where?: OrganizationWhereInput
    data: XOR<OrganizationUpdateWithoutClientsInput, OrganizationUncheckedUpdateWithoutClientsInput>
  }

  export type OrganizationUpdateWithoutClientsInput = {
    name?: StringFieldUpdateOperationsInput | string
    taxNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    type?: EnumOrganizationTypeFieldUpdateOperationsInput | $Enums.OrganizationType
    activityCode?: NullableStringFieldUpdateOperationsInput | string | null
    activityName?: NullableStringFieldUpdateOperationsInput | string | null
    isClientOrg?: BoolFieldUpdateOperationsInput | boolean
    forms?: FormUpdateManyWithoutOrganizationNestedInput
    members?: OrganizationMemberUpdateManyWithoutOrganizationNestedInput
    createdBy?: UserUpdateOneRequiredWithoutCreatedOrganizationsNestedInput
    workers?: WorkerUpdateManyWithoutOrganizationNestedInput
  }

  export type OrganizationUncheckedUpdateWithoutClientsInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    taxNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdById?: IntFieldUpdateOperationsInput | number
    type?: EnumOrganizationTypeFieldUpdateOperationsInput | $Enums.OrganizationType
    activityCode?: NullableStringFieldUpdateOperationsInput | string | null
    activityName?: NullableStringFieldUpdateOperationsInput | string | null
    isClientOrg?: BoolFieldUpdateOperationsInput | boolean
    forms?: FormUncheckedUpdateManyWithoutOrganizationNestedInput
    members?: OrganizationMemberUncheckedUpdateManyWithoutOrganizationNestedInput
    workers?: WorkerUncheckedUpdateManyWithoutOrganizationNestedInput
  }

  export type FormUpsertWithWhereUniqueWithoutClientInput = {
    where: FormWhereUniqueInput
    update: XOR<FormUpdateWithoutClientInput, FormUncheckedUpdateWithoutClientInput>
    create: XOR<FormCreateWithoutClientInput, FormUncheckedCreateWithoutClientInput>
  }

  export type FormUpdateWithWhereUniqueWithoutClientInput = {
    where: FormWhereUniqueInput
    data: XOR<FormUpdateWithoutClientInput, FormUncheckedUpdateWithoutClientInput>
  }

  export type FormUpdateManyWithWhereWithoutClientInput = {
    where: FormScalarWhereInput
    data: XOR<FormUpdateManyMutationInput, FormUncheckedUpdateManyWithoutClientInput>
  }

  export type FormAttachmentCreateWithoutFormInput = {
    fileName: string
    fileUrl: string
    mimeType?: string | null
    createdAt?: Date | string
  }

  export type FormAttachmentUncheckedCreateWithoutFormInput = {
    id?: number
    fileName: string
    fileUrl: string
    mimeType?: string | null
    createdAt?: Date | string
  }

  export type FormAttachmentCreateOrConnectWithoutFormInput = {
    where: FormAttachmentWhereUniqueInput
    create: XOR<FormAttachmentCreateWithoutFormInput, FormAttachmentUncheckedCreateWithoutFormInput>
  }

  export type FormAttachmentCreateManyFormInputEnvelope = {
    data: FormAttachmentCreateManyFormInput | FormAttachmentCreateManyFormInput[]
    skipDuplicates?: boolean
  }

  export type FormVersionCreateWithoutFormInput = {
    versionNumber: number
    data: string
    pdfUrl?: string | null
    createdAt?: Date | string
  }

  export type FormVersionUncheckedCreateWithoutFormInput = {
    id?: number
    versionNumber: number
    data: string
    pdfUrl?: string | null
    createdAt?: Date | string
  }

  export type FormVersionCreateOrConnectWithoutFormInput = {
    where: FormVersionWhereUniqueInput
    create: XOR<FormVersionCreateWithoutFormInput, FormVersionUncheckedCreateWithoutFormInput>
  }

  export type FormVersionCreateManyFormInputEnvelope = {
    data: FormVersionCreateManyFormInput | FormVersionCreateManyFormInput[]
    skipDuplicates?: boolean
  }

  export type ClientCreateWithoutFormsInput = {
    type?: $Enums.ClientType
    firstName?: string | null
    lastName?: string | null
    companyName?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    jmbg?: string | null
    taxNumber?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    amortizacijaOnly?: boolean
    idCardNumber?: string | null
    createdBy?: UserCreateNestedOneWithoutCreatedClientsInput
    organization?: OrganizationCreateNestedOneWithoutClientsInput
  }

  export type ClientUncheckedCreateWithoutFormsInput = {
    id?: number
    organizationId?: number | null
    type?: $Enums.ClientType
    firstName?: string | null
    lastName?: string | null
    companyName?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    jmbg?: string | null
    taxNumber?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    createdById?: number | null
    amortizacijaOnly?: boolean
    idCardNumber?: string | null
  }

  export type ClientCreateOrConnectWithoutFormsInput = {
    where: ClientWhereUniqueInput
    create: XOR<ClientCreateWithoutFormsInput, ClientUncheckedCreateWithoutFormsInput>
  }

  export type UserCreateWithoutCreatedFormsInput = {
    googleId?: string | null
    email?: string | null
    password?: string | null
    firstName: string
    lastName: string
    phone?: string | null
    address?: string | null
    role?: $Enums.users_role
    createdAt?: Date | string
    updatedAt?: Date | string
    jmbg?: string | null
    passwordResetToken?: string | null
    passwordResetTokenExpiry?: Date | string | null
    emailVerificationExpiry?: Date | string | null
    emailVerificationToken?: string | null
    isEmailVerified?: boolean
    idCardNumber?: string | null
    createdClients?: ClientCreateNestedManyWithoutCreatedByInput
    updatedForms?: FormCreateNestedManyWithoutUpdatedByInput
    organizations?: OrganizationMemberCreateNestedManyWithoutUserInput
    createdOrganizations?: OrganizationCreateNestedManyWithoutCreatedByInput
    subscription?: SubscriptionCreateNestedOneWithoutUserInput
  }

  export type UserUncheckedCreateWithoutCreatedFormsInput = {
    id?: number
    googleId?: string | null
    email?: string | null
    password?: string | null
    firstName: string
    lastName: string
    phone?: string | null
    address?: string | null
    role?: $Enums.users_role
    createdAt?: Date | string
    updatedAt?: Date | string
    jmbg?: string | null
    passwordResetToken?: string | null
    passwordResetTokenExpiry?: Date | string | null
    emailVerificationExpiry?: Date | string | null
    emailVerificationToken?: string | null
    isEmailVerified?: boolean
    idCardNumber?: string | null
    createdClients?: ClientUncheckedCreateNestedManyWithoutCreatedByInput
    updatedForms?: FormUncheckedCreateNestedManyWithoutUpdatedByInput
    organizations?: OrganizationMemberUncheckedCreateNestedManyWithoutUserInput
    createdOrganizations?: OrganizationUncheckedCreateNestedManyWithoutCreatedByInput
    subscription?: SubscriptionUncheckedCreateNestedOneWithoutUserInput
  }

  export type UserCreateOrConnectWithoutCreatedFormsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutCreatedFormsInput, UserUncheckedCreateWithoutCreatedFormsInput>
  }

  export type OrganizationCreateWithoutFormsInput = {
    name: string
    taxNumber?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    type?: $Enums.OrganizationType
    activityCode?: string | null
    activityName?: string | null
    isClientOrg?: boolean
    clients?: ClientCreateNestedManyWithoutOrganizationInput
    members?: OrganizationMemberCreateNestedManyWithoutOrganizationInput
    createdBy: UserCreateNestedOneWithoutCreatedOrganizationsInput
    workers?: WorkerCreateNestedManyWithoutOrganizationInput
  }

  export type OrganizationUncheckedCreateWithoutFormsInput = {
    id?: number
    name: string
    taxNumber?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    createdById: number
    type?: $Enums.OrganizationType
    activityCode?: string | null
    activityName?: string | null
    isClientOrg?: boolean
    clients?: ClientUncheckedCreateNestedManyWithoutOrganizationInput
    members?: OrganizationMemberUncheckedCreateNestedManyWithoutOrganizationInput
    workers?: WorkerUncheckedCreateNestedManyWithoutOrganizationInput
  }

  export type OrganizationCreateOrConnectWithoutFormsInput = {
    where: OrganizationWhereUniqueInput
    create: XOR<OrganizationCreateWithoutFormsInput, OrganizationUncheckedCreateWithoutFormsInput>
  }

  export type UserCreateWithoutUpdatedFormsInput = {
    googleId?: string | null
    email?: string | null
    password?: string | null
    firstName: string
    lastName: string
    phone?: string | null
    address?: string | null
    role?: $Enums.users_role
    createdAt?: Date | string
    updatedAt?: Date | string
    jmbg?: string | null
    passwordResetToken?: string | null
    passwordResetTokenExpiry?: Date | string | null
    emailVerificationExpiry?: Date | string | null
    emailVerificationToken?: string | null
    isEmailVerified?: boolean
    idCardNumber?: string | null
    createdClients?: ClientCreateNestedManyWithoutCreatedByInput
    createdForms?: FormCreateNestedManyWithoutCreatedByInput
    organizations?: OrganizationMemberCreateNestedManyWithoutUserInput
    createdOrganizations?: OrganizationCreateNestedManyWithoutCreatedByInput
    subscription?: SubscriptionCreateNestedOneWithoutUserInput
  }

  export type UserUncheckedCreateWithoutUpdatedFormsInput = {
    id?: number
    googleId?: string | null
    email?: string | null
    password?: string | null
    firstName: string
    lastName: string
    phone?: string | null
    address?: string | null
    role?: $Enums.users_role
    createdAt?: Date | string
    updatedAt?: Date | string
    jmbg?: string | null
    passwordResetToken?: string | null
    passwordResetTokenExpiry?: Date | string | null
    emailVerificationExpiry?: Date | string | null
    emailVerificationToken?: string | null
    isEmailVerified?: boolean
    idCardNumber?: string | null
    createdClients?: ClientUncheckedCreateNestedManyWithoutCreatedByInput
    createdForms?: FormUncheckedCreateNestedManyWithoutCreatedByInput
    organizations?: OrganizationMemberUncheckedCreateNestedManyWithoutUserInput
    createdOrganizations?: OrganizationUncheckedCreateNestedManyWithoutCreatedByInput
    subscription?: SubscriptionUncheckedCreateNestedOneWithoutUserInput
  }

  export type UserCreateOrConnectWithoutUpdatedFormsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutUpdatedFormsInput, UserUncheckedCreateWithoutUpdatedFormsInput>
  }

  export type FormAttachmentUpsertWithWhereUniqueWithoutFormInput = {
    where: FormAttachmentWhereUniqueInput
    update: XOR<FormAttachmentUpdateWithoutFormInput, FormAttachmentUncheckedUpdateWithoutFormInput>
    create: XOR<FormAttachmentCreateWithoutFormInput, FormAttachmentUncheckedCreateWithoutFormInput>
  }

  export type FormAttachmentUpdateWithWhereUniqueWithoutFormInput = {
    where: FormAttachmentWhereUniqueInput
    data: XOR<FormAttachmentUpdateWithoutFormInput, FormAttachmentUncheckedUpdateWithoutFormInput>
  }

  export type FormAttachmentUpdateManyWithWhereWithoutFormInput = {
    where: FormAttachmentScalarWhereInput
    data: XOR<FormAttachmentUpdateManyMutationInput, FormAttachmentUncheckedUpdateManyWithoutFormInput>
  }

  export type FormAttachmentScalarWhereInput = {
    AND?: FormAttachmentScalarWhereInput | FormAttachmentScalarWhereInput[]
    OR?: FormAttachmentScalarWhereInput[]
    NOT?: FormAttachmentScalarWhereInput | FormAttachmentScalarWhereInput[]
    id?: IntFilter<"FormAttachment"> | number
    formId?: IntFilter<"FormAttachment"> | number
    fileName?: StringFilter<"FormAttachment"> | string
    fileUrl?: StringFilter<"FormAttachment"> | string
    mimeType?: StringNullableFilter<"FormAttachment"> | string | null
    createdAt?: DateTimeFilter<"FormAttachment"> | Date | string
  }

  export type FormVersionUpsertWithWhereUniqueWithoutFormInput = {
    where: FormVersionWhereUniqueInput
    update: XOR<FormVersionUpdateWithoutFormInput, FormVersionUncheckedUpdateWithoutFormInput>
    create: XOR<FormVersionCreateWithoutFormInput, FormVersionUncheckedCreateWithoutFormInput>
  }

  export type FormVersionUpdateWithWhereUniqueWithoutFormInput = {
    where: FormVersionWhereUniqueInput
    data: XOR<FormVersionUpdateWithoutFormInput, FormVersionUncheckedUpdateWithoutFormInput>
  }

  export type FormVersionUpdateManyWithWhereWithoutFormInput = {
    where: FormVersionScalarWhereInput
    data: XOR<FormVersionUpdateManyMutationInput, FormVersionUncheckedUpdateManyWithoutFormInput>
  }

  export type FormVersionScalarWhereInput = {
    AND?: FormVersionScalarWhereInput | FormVersionScalarWhereInput[]
    OR?: FormVersionScalarWhereInput[]
    NOT?: FormVersionScalarWhereInput | FormVersionScalarWhereInput[]
    id?: IntFilter<"FormVersion"> | number
    formId?: IntFilter<"FormVersion"> | number
    versionNumber?: IntFilter<"FormVersion"> | number
    data?: StringFilter<"FormVersion"> | string
    pdfUrl?: StringNullableFilter<"FormVersion"> | string | null
    createdAt?: DateTimeFilter<"FormVersion"> | Date | string
  }

  export type ClientUpsertWithoutFormsInput = {
    update: XOR<ClientUpdateWithoutFormsInput, ClientUncheckedUpdateWithoutFormsInput>
    create: XOR<ClientCreateWithoutFormsInput, ClientUncheckedCreateWithoutFormsInput>
    where?: ClientWhereInput
  }

  export type ClientUpdateToOneWithWhereWithoutFormsInput = {
    where?: ClientWhereInput
    data: XOR<ClientUpdateWithoutFormsInput, ClientUncheckedUpdateWithoutFormsInput>
  }

  export type ClientUpdateWithoutFormsInput = {
    type?: EnumClientTypeFieldUpdateOperationsInput | $Enums.ClientType
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    companyName?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    taxNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    amortizacijaOnly?: BoolFieldUpdateOperationsInput | boolean
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: UserUpdateOneWithoutCreatedClientsNestedInput
    organization?: OrganizationUpdateOneWithoutClientsNestedInput
  }

  export type ClientUncheckedUpdateWithoutFormsInput = {
    id?: IntFieldUpdateOperationsInput | number
    organizationId?: NullableIntFieldUpdateOperationsInput | number | null
    type?: EnumClientTypeFieldUpdateOperationsInput | $Enums.ClientType
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    companyName?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    taxNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdById?: NullableIntFieldUpdateOperationsInput | number | null
    amortizacijaOnly?: BoolFieldUpdateOperationsInput | boolean
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type UserUpsertWithoutCreatedFormsInput = {
    update: XOR<UserUpdateWithoutCreatedFormsInput, UserUncheckedUpdateWithoutCreatedFormsInput>
    create: XOR<UserCreateWithoutCreatedFormsInput, UserUncheckedCreateWithoutCreatedFormsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutCreatedFormsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutCreatedFormsInput, UserUncheckedUpdateWithoutCreatedFormsInput>
  }

  export type UserUpdateWithoutCreatedFormsInput = {
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    role?: Enumusers_roleFieldUpdateOperationsInput | $Enums.users_role
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetToken?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetTokenExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdClients?: ClientUpdateManyWithoutCreatedByNestedInput
    updatedForms?: FormUpdateManyWithoutUpdatedByNestedInput
    organizations?: OrganizationMemberUpdateManyWithoutUserNestedInput
    createdOrganizations?: OrganizationUpdateManyWithoutCreatedByNestedInput
    subscription?: SubscriptionUpdateOneWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutCreatedFormsInput = {
    id?: IntFieldUpdateOperationsInput | number
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    role?: Enumusers_roleFieldUpdateOperationsInput | $Enums.users_role
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetToken?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetTokenExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdClients?: ClientUncheckedUpdateManyWithoutCreatedByNestedInput
    updatedForms?: FormUncheckedUpdateManyWithoutUpdatedByNestedInput
    organizations?: OrganizationMemberUncheckedUpdateManyWithoutUserNestedInput
    createdOrganizations?: OrganizationUncheckedUpdateManyWithoutCreatedByNestedInput
    subscription?: SubscriptionUncheckedUpdateOneWithoutUserNestedInput
  }

  export type OrganizationUpsertWithoutFormsInput = {
    update: XOR<OrganizationUpdateWithoutFormsInput, OrganizationUncheckedUpdateWithoutFormsInput>
    create: XOR<OrganizationCreateWithoutFormsInput, OrganizationUncheckedCreateWithoutFormsInput>
    where?: OrganizationWhereInput
  }

  export type OrganizationUpdateToOneWithWhereWithoutFormsInput = {
    where?: OrganizationWhereInput
    data: XOR<OrganizationUpdateWithoutFormsInput, OrganizationUncheckedUpdateWithoutFormsInput>
  }

  export type OrganizationUpdateWithoutFormsInput = {
    name?: StringFieldUpdateOperationsInput | string
    taxNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    type?: EnumOrganizationTypeFieldUpdateOperationsInput | $Enums.OrganizationType
    activityCode?: NullableStringFieldUpdateOperationsInput | string | null
    activityName?: NullableStringFieldUpdateOperationsInput | string | null
    isClientOrg?: BoolFieldUpdateOperationsInput | boolean
    clients?: ClientUpdateManyWithoutOrganizationNestedInput
    members?: OrganizationMemberUpdateManyWithoutOrganizationNestedInput
    createdBy?: UserUpdateOneRequiredWithoutCreatedOrganizationsNestedInput
    workers?: WorkerUpdateManyWithoutOrganizationNestedInput
  }

  export type OrganizationUncheckedUpdateWithoutFormsInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    taxNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdById?: IntFieldUpdateOperationsInput | number
    type?: EnumOrganizationTypeFieldUpdateOperationsInput | $Enums.OrganizationType
    activityCode?: NullableStringFieldUpdateOperationsInput | string | null
    activityName?: NullableStringFieldUpdateOperationsInput | string | null
    isClientOrg?: BoolFieldUpdateOperationsInput | boolean
    clients?: ClientUncheckedUpdateManyWithoutOrganizationNestedInput
    members?: OrganizationMemberUncheckedUpdateManyWithoutOrganizationNestedInput
    workers?: WorkerUncheckedUpdateManyWithoutOrganizationNestedInput
  }

  export type UserUpsertWithoutUpdatedFormsInput = {
    update: XOR<UserUpdateWithoutUpdatedFormsInput, UserUncheckedUpdateWithoutUpdatedFormsInput>
    create: XOR<UserCreateWithoutUpdatedFormsInput, UserUncheckedCreateWithoutUpdatedFormsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutUpdatedFormsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutUpdatedFormsInput, UserUncheckedUpdateWithoutUpdatedFormsInput>
  }

  export type UserUpdateWithoutUpdatedFormsInput = {
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    role?: Enumusers_roleFieldUpdateOperationsInput | $Enums.users_role
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetToken?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetTokenExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdClients?: ClientUpdateManyWithoutCreatedByNestedInput
    createdForms?: FormUpdateManyWithoutCreatedByNestedInput
    organizations?: OrganizationMemberUpdateManyWithoutUserNestedInput
    createdOrganizations?: OrganizationUpdateManyWithoutCreatedByNestedInput
    subscription?: SubscriptionUpdateOneWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutUpdatedFormsInput = {
    id?: IntFieldUpdateOperationsInput | number
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    role?: Enumusers_roleFieldUpdateOperationsInput | $Enums.users_role
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetToken?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetTokenExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdClients?: ClientUncheckedUpdateManyWithoutCreatedByNestedInput
    createdForms?: FormUncheckedUpdateManyWithoutCreatedByNestedInput
    organizations?: OrganizationMemberUncheckedUpdateManyWithoutUserNestedInput
    createdOrganizations?: OrganizationUncheckedUpdateManyWithoutCreatedByNestedInput
    subscription?: SubscriptionUncheckedUpdateOneWithoutUserNestedInput
  }

  export type FormCreateWithoutVersionsInput = {
    type: $Enums.forms_type
    status?: $Enums.FormStatus
    year: number
    month?: number | null
    title?: string | null
    pdfUrl?: string | null
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    attachments?: FormAttachmentCreateNestedManyWithoutFormInput
    client?: ClientCreateNestedOneWithoutFormsInput
    createdBy: UserCreateNestedOneWithoutCreatedFormsInput
    organization?: OrganizationCreateNestedOneWithoutFormsInput
    updatedBy?: UserCreateNestedOneWithoutUpdatedFormsInput
  }

  export type FormUncheckedCreateWithoutVersionsInput = {
    id?: number
    type: $Enums.forms_type
    status?: $Enums.FormStatus
    year: number
    month?: number | null
    title?: string | null
    organizationId?: number | null
    clientId?: number | null
    createdById: number
    updatedById?: number | null
    pdfUrl?: string | null
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    attachments?: FormAttachmentUncheckedCreateNestedManyWithoutFormInput
  }

  export type FormCreateOrConnectWithoutVersionsInput = {
    where: FormWhereUniqueInput
    create: XOR<FormCreateWithoutVersionsInput, FormUncheckedCreateWithoutVersionsInput>
  }

  export type FormUpsertWithoutVersionsInput = {
    update: XOR<FormUpdateWithoutVersionsInput, FormUncheckedUpdateWithoutVersionsInput>
    create: XOR<FormCreateWithoutVersionsInput, FormUncheckedCreateWithoutVersionsInput>
    where?: FormWhereInput
  }

  export type FormUpdateToOneWithWhereWithoutVersionsInput = {
    where?: FormWhereInput
    data: XOR<FormUpdateWithoutVersionsInput, FormUncheckedUpdateWithoutVersionsInput>
  }

  export type FormUpdateWithoutVersionsInput = {
    type?: Enumforms_typeFieldUpdateOperationsInput | $Enums.forms_type
    status?: EnumFormStatusFieldUpdateOperationsInput | $Enums.FormStatus
    year?: IntFieldUpdateOperationsInput | number
    month?: NullableIntFieldUpdateOperationsInput | number | null
    title?: NullableStringFieldUpdateOperationsInput | string | null
    pdfUrl?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    attachments?: FormAttachmentUpdateManyWithoutFormNestedInput
    client?: ClientUpdateOneWithoutFormsNestedInput
    createdBy?: UserUpdateOneRequiredWithoutCreatedFormsNestedInput
    organization?: OrganizationUpdateOneWithoutFormsNestedInput
    updatedBy?: UserUpdateOneWithoutUpdatedFormsNestedInput
  }

  export type FormUncheckedUpdateWithoutVersionsInput = {
    id?: IntFieldUpdateOperationsInput | number
    type?: Enumforms_typeFieldUpdateOperationsInput | $Enums.forms_type
    status?: EnumFormStatusFieldUpdateOperationsInput | $Enums.FormStatus
    year?: IntFieldUpdateOperationsInput | number
    month?: NullableIntFieldUpdateOperationsInput | number | null
    title?: NullableStringFieldUpdateOperationsInput | string | null
    organizationId?: NullableIntFieldUpdateOperationsInput | number | null
    clientId?: NullableIntFieldUpdateOperationsInput | number | null
    createdById?: IntFieldUpdateOperationsInput | number
    updatedById?: NullableIntFieldUpdateOperationsInput | number | null
    pdfUrl?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    attachments?: FormAttachmentUncheckedUpdateManyWithoutFormNestedInput
  }

  export type FormCreateWithoutAttachmentsInput = {
    type: $Enums.forms_type
    status?: $Enums.FormStatus
    year: number
    month?: number | null
    title?: string | null
    pdfUrl?: string | null
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    versions?: FormVersionCreateNestedManyWithoutFormInput
    client?: ClientCreateNestedOneWithoutFormsInput
    createdBy: UserCreateNestedOneWithoutCreatedFormsInput
    organization?: OrganizationCreateNestedOneWithoutFormsInput
    updatedBy?: UserCreateNestedOneWithoutUpdatedFormsInput
  }

  export type FormUncheckedCreateWithoutAttachmentsInput = {
    id?: number
    type: $Enums.forms_type
    status?: $Enums.FormStatus
    year: number
    month?: number | null
    title?: string | null
    organizationId?: number | null
    clientId?: number | null
    createdById: number
    updatedById?: number | null
    pdfUrl?: string | null
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    versions?: FormVersionUncheckedCreateNestedManyWithoutFormInput
  }

  export type FormCreateOrConnectWithoutAttachmentsInput = {
    where: FormWhereUniqueInput
    create: XOR<FormCreateWithoutAttachmentsInput, FormUncheckedCreateWithoutAttachmentsInput>
  }

  export type FormUpsertWithoutAttachmentsInput = {
    update: XOR<FormUpdateWithoutAttachmentsInput, FormUncheckedUpdateWithoutAttachmentsInput>
    create: XOR<FormCreateWithoutAttachmentsInput, FormUncheckedCreateWithoutAttachmentsInput>
    where?: FormWhereInput
  }

  export type FormUpdateToOneWithWhereWithoutAttachmentsInput = {
    where?: FormWhereInput
    data: XOR<FormUpdateWithoutAttachmentsInput, FormUncheckedUpdateWithoutAttachmentsInput>
  }

  export type FormUpdateWithoutAttachmentsInput = {
    type?: Enumforms_typeFieldUpdateOperationsInput | $Enums.forms_type
    status?: EnumFormStatusFieldUpdateOperationsInput | $Enums.FormStatus
    year?: IntFieldUpdateOperationsInput | number
    month?: NullableIntFieldUpdateOperationsInput | number | null
    title?: NullableStringFieldUpdateOperationsInput | string | null
    pdfUrl?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    versions?: FormVersionUpdateManyWithoutFormNestedInput
    client?: ClientUpdateOneWithoutFormsNestedInput
    createdBy?: UserUpdateOneRequiredWithoutCreatedFormsNestedInput
    organization?: OrganizationUpdateOneWithoutFormsNestedInput
    updatedBy?: UserUpdateOneWithoutUpdatedFormsNestedInput
  }

  export type FormUncheckedUpdateWithoutAttachmentsInput = {
    id?: IntFieldUpdateOperationsInput | number
    type?: Enumforms_typeFieldUpdateOperationsInput | $Enums.forms_type
    status?: EnumFormStatusFieldUpdateOperationsInput | $Enums.FormStatus
    year?: IntFieldUpdateOperationsInput | number
    month?: NullableIntFieldUpdateOperationsInput | number | null
    title?: NullableStringFieldUpdateOperationsInput | string | null
    organizationId?: NullableIntFieldUpdateOperationsInput | number | null
    clientId?: NullableIntFieldUpdateOperationsInput | number | null
    createdById?: IntFieldUpdateOperationsInput | number
    updatedById?: NullableIntFieldUpdateOperationsInput | number | null
    pdfUrl?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    versions?: FormVersionUncheckedUpdateManyWithoutFormNestedInput
  }

  export type ClientCreateManyCreatedByInput = {
    id?: number
    organizationId?: number | null
    type?: $Enums.ClientType
    firstName?: string | null
    lastName?: string | null
    companyName?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    jmbg?: string | null
    taxNumber?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    amortizacijaOnly?: boolean
    idCardNumber?: string | null
  }

  export type FormCreateManyCreatedByInput = {
    id?: number
    type: $Enums.forms_type
    status?: $Enums.FormStatus
    year: number
    month?: number | null
    title?: string | null
    organizationId?: number | null
    clientId?: number | null
    updatedById?: number | null
    pdfUrl?: string | null
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FormCreateManyUpdatedByInput = {
    id?: number
    type: $Enums.forms_type
    status?: $Enums.FormStatus
    year: number
    month?: number | null
    title?: string | null
    organizationId?: number | null
    clientId?: number | null
    createdById: number
    pdfUrl?: string | null
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type OrganizationMemberCreateManyUserInput = {
    id?: number
    organizationId: number
    role?: $Enums.OrganizationRole
    joinedAt?: Date | string
  }

  export type OrganizationCreateManyCreatedByInput = {
    id?: number
    name: string
    taxNumber?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    type?: $Enums.OrganizationType
    activityCode?: string | null
    activityName?: string | null
    isClientOrg?: boolean
  }

  export type ClientUpdateWithoutCreatedByInput = {
    type?: EnumClientTypeFieldUpdateOperationsInput | $Enums.ClientType
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    companyName?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    taxNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    amortizacijaOnly?: BoolFieldUpdateOperationsInput | boolean
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
    organization?: OrganizationUpdateOneWithoutClientsNestedInput
    forms?: FormUpdateManyWithoutClientNestedInput
  }

  export type ClientUncheckedUpdateWithoutCreatedByInput = {
    id?: IntFieldUpdateOperationsInput | number
    organizationId?: NullableIntFieldUpdateOperationsInput | number | null
    type?: EnumClientTypeFieldUpdateOperationsInput | $Enums.ClientType
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    companyName?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    taxNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    amortizacijaOnly?: BoolFieldUpdateOperationsInput | boolean
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
    forms?: FormUncheckedUpdateManyWithoutClientNestedInput
  }

  export type ClientUncheckedUpdateManyWithoutCreatedByInput = {
    id?: IntFieldUpdateOperationsInput | number
    organizationId?: NullableIntFieldUpdateOperationsInput | number | null
    type?: EnumClientTypeFieldUpdateOperationsInput | $Enums.ClientType
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    companyName?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    taxNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    amortizacijaOnly?: BoolFieldUpdateOperationsInput | boolean
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type FormUpdateWithoutCreatedByInput = {
    type?: Enumforms_typeFieldUpdateOperationsInput | $Enums.forms_type
    status?: EnumFormStatusFieldUpdateOperationsInput | $Enums.FormStatus
    year?: IntFieldUpdateOperationsInput | number
    month?: NullableIntFieldUpdateOperationsInput | number | null
    title?: NullableStringFieldUpdateOperationsInput | string | null
    pdfUrl?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    attachments?: FormAttachmentUpdateManyWithoutFormNestedInput
    versions?: FormVersionUpdateManyWithoutFormNestedInput
    client?: ClientUpdateOneWithoutFormsNestedInput
    organization?: OrganizationUpdateOneWithoutFormsNestedInput
    updatedBy?: UserUpdateOneWithoutUpdatedFormsNestedInput
  }

  export type FormUncheckedUpdateWithoutCreatedByInput = {
    id?: IntFieldUpdateOperationsInput | number
    type?: Enumforms_typeFieldUpdateOperationsInput | $Enums.forms_type
    status?: EnumFormStatusFieldUpdateOperationsInput | $Enums.FormStatus
    year?: IntFieldUpdateOperationsInput | number
    month?: NullableIntFieldUpdateOperationsInput | number | null
    title?: NullableStringFieldUpdateOperationsInput | string | null
    organizationId?: NullableIntFieldUpdateOperationsInput | number | null
    clientId?: NullableIntFieldUpdateOperationsInput | number | null
    updatedById?: NullableIntFieldUpdateOperationsInput | number | null
    pdfUrl?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    attachments?: FormAttachmentUncheckedUpdateManyWithoutFormNestedInput
    versions?: FormVersionUncheckedUpdateManyWithoutFormNestedInput
  }

  export type FormUncheckedUpdateManyWithoutCreatedByInput = {
    id?: IntFieldUpdateOperationsInput | number
    type?: Enumforms_typeFieldUpdateOperationsInput | $Enums.forms_type
    status?: EnumFormStatusFieldUpdateOperationsInput | $Enums.FormStatus
    year?: IntFieldUpdateOperationsInput | number
    month?: NullableIntFieldUpdateOperationsInput | number | null
    title?: NullableStringFieldUpdateOperationsInput | string | null
    organizationId?: NullableIntFieldUpdateOperationsInput | number | null
    clientId?: NullableIntFieldUpdateOperationsInput | number | null
    updatedById?: NullableIntFieldUpdateOperationsInput | number | null
    pdfUrl?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FormUpdateWithoutUpdatedByInput = {
    type?: Enumforms_typeFieldUpdateOperationsInput | $Enums.forms_type
    status?: EnumFormStatusFieldUpdateOperationsInput | $Enums.FormStatus
    year?: IntFieldUpdateOperationsInput | number
    month?: NullableIntFieldUpdateOperationsInput | number | null
    title?: NullableStringFieldUpdateOperationsInput | string | null
    pdfUrl?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    attachments?: FormAttachmentUpdateManyWithoutFormNestedInput
    versions?: FormVersionUpdateManyWithoutFormNestedInput
    client?: ClientUpdateOneWithoutFormsNestedInput
    createdBy?: UserUpdateOneRequiredWithoutCreatedFormsNestedInput
    organization?: OrganizationUpdateOneWithoutFormsNestedInput
  }

  export type FormUncheckedUpdateWithoutUpdatedByInput = {
    id?: IntFieldUpdateOperationsInput | number
    type?: Enumforms_typeFieldUpdateOperationsInput | $Enums.forms_type
    status?: EnumFormStatusFieldUpdateOperationsInput | $Enums.FormStatus
    year?: IntFieldUpdateOperationsInput | number
    month?: NullableIntFieldUpdateOperationsInput | number | null
    title?: NullableStringFieldUpdateOperationsInput | string | null
    organizationId?: NullableIntFieldUpdateOperationsInput | number | null
    clientId?: NullableIntFieldUpdateOperationsInput | number | null
    createdById?: IntFieldUpdateOperationsInput | number
    pdfUrl?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    attachments?: FormAttachmentUncheckedUpdateManyWithoutFormNestedInput
    versions?: FormVersionUncheckedUpdateManyWithoutFormNestedInput
  }

  export type FormUncheckedUpdateManyWithoutUpdatedByInput = {
    id?: IntFieldUpdateOperationsInput | number
    type?: Enumforms_typeFieldUpdateOperationsInput | $Enums.forms_type
    status?: EnumFormStatusFieldUpdateOperationsInput | $Enums.FormStatus
    year?: IntFieldUpdateOperationsInput | number
    month?: NullableIntFieldUpdateOperationsInput | number | null
    title?: NullableStringFieldUpdateOperationsInput | string | null
    organizationId?: NullableIntFieldUpdateOperationsInput | number | null
    clientId?: NullableIntFieldUpdateOperationsInput | number | null
    createdById?: IntFieldUpdateOperationsInput | number
    pdfUrl?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OrganizationMemberUpdateWithoutUserInput = {
    role?: EnumOrganizationRoleFieldUpdateOperationsInput | $Enums.OrganizationRole
    joinedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    organization?: OrganizationUpdateOneRequiredWithoutMembersNestedInput
  }

  export type OrganizationMemberUncheckedUpdateWithoutUserInput = {
    id?: IntFieldUpdateOperationsInput | number
    organizationId?: IntFieldUpdateOperationsInput | number
    role?: EnumOrganizationRoleFieldUpdateOperationsInput | $Enums.OrganizationRole
    joinedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OrganizationMemberUncheckedUpdateManyWithoutUserInput = {
    id?: IntFieldUpdateOperationsInput | number
    organizationId?: IntFieldUpdateOperationsInput | number
    role?: EnumOrganizationRoleFieldUpdateOperationsInput | $Enums.OrganizationRole
    joinedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OrganizationUpdateWithoutCreatedByInput = {
    name?: StringFieldUpdateOperationsInput | string
    taxNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    type?: EnumOrganizationTypeFieldUpdateOperationsInput | $Enums.OrganizationType
    activityCode?: NullableStringFieldUpdateOperationsInput | string | null
    activityName?: NullableStringFieldUpdateOperationsInput | string | null
    isClientOrg?: BoolFieldUpdateOperationsInput | boolean
    clients?: ClientUpdateManyWithoutOrganizationNestedInput
    forms?: FormUpdateManyWithoutOrganizationNestedInput
    members?: OrganizationMemberUpdateManyWithoutOrganizationNestedInput
    workers?: WorkerUpdateManyWithoutOrganizationNestedInput
  }

  export type OrganizationUncheckedUpdateWithoutCreatedByInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    taxNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    type?: EnumOrganizationTypeFieldUpdateOperationsInput | $Enums.OrganizationType
    activityCode?: NullableStringFieldUpdateOperationsInput | string | null
    activityName?: NullableStringFieldUpdateOperationsInput | string | null
    isClientOrg?: BoolFieldUpdateOperationsInput | boolean
    clients?: ClientUncheckedUpdateManyWithoutOrganizationNestedInput
    forms?: FormUncheckedUpdateManyWithoutOrganizationNestedInput
    members?: OrganizationMemberUncheckedUpdateManyWithoutOrganizationNestedInput
    workers?: WorkerUncheckedUpdateManyWithoutOrganizationNestedInput
  }

  export type OrganizationUncheckedUpdateManyWithoutCreatedByInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    taxNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    type?: EnumOrganizationTypeFieldUpdateOperationsInput | $Enums.OrganizationType
    activityCode?: NullableStringFieldUpdateOperationsInput | string | null
    activityName?: NullableStringFieldUpdateOperationsInput | string | null
    isClientOrg?: BoolFieldUpdateOperationsInput | boolean
  }

  export type ClientCreateManyOrganizationInput = {
    id?: number
    type?: $Enums.ClientType
    firstName?: string | null
    lastName?: string | null
    companyName?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    jmbg?: string | null
    taxNumber?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    createdById?: number | null
    amortizacijaOnly?: boolean
    idCardNumber?: string | null
  }

  export type FormCreateManyOrganizationInput = {
    id?: number
    type: $Enums.forms_type
    status?: $Enums.FormStatus
    year: number
    month?: number | null
    title?: string | null
    clientId?: number | null
    createdById: number
    updatedById?: number | null
    pdfUrl?: string | null
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type OrganizationMemberCreateManyOrganizationInput = {
    id?: number
    userId: number
    role?: $Enums.OrganizationRole
    joinedAt?: Date | string
  }

  export type WorkerCreateManyOrganizationInput = {
    id?: number
    firstName: string
    lastName: string
    jmbg?: string | null
    startDate?: Date | string | null
    endDate?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    address?: string | null
    email?: string | null
    phone?: string | null
    role?: $Enums.WorkerRole
    idCardNumber?: string | null
  }

  export type ClientUpdateWithoutOrganizationInput = {
    type?: EnumClientTypeFieldUpdateOperationsInput | $Enums.ClientType
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    companyName?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    taxNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    amortizacijaOnly?: BoolFieldUpdateOperationsInput | boolean
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: UserUpdateOneWithoutCreatedClientsNestedInput
    forms?: FormUpdateManyWithoutClientNestedInput
  }

  export type ClientUncheckedUpdateWithoutOrganizationInput = {
    id?: IntFieldUpdateOperationsInput | number
    type?: EnumClientTypeFieldUpdateOperationsInput | $Enums.ClientType
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    companyName?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    taxNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdById?: NullableIntFieldUpdateOperationsInput | number | null
    amortizacijaOnly?: BoolFieldUpdateOperationsInput | boolean
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
    forms?: FormUncheckedUpdateManyWithoutClientNestedInput
  }

  export type ClientUncheckedUpdateManyWithoutOrganizationInput = {
    id?: IntFieldUpdateOperationsInput | number
    type?: EnumClientTypeFieldUpdateOperationsInput | $Enums.ClientType
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    companyName?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    taxNumber?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdById?: NullableIntFieldUpdateOperationsInput | number | null
    amortizacijaOnly?: BoolFieldUpdateOperationsInput | boolean
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type FormUpdateWithoutOrganizationInput = {
    type?: Enumforms_typeFieldUpdateOperationsInput | $Enums.forms_type
    status?: EnumFormStatusFieldUpdateOperationsInput | $Enums.FormStatus
    year?: IntFieldUpdateOperationsInput | number
    month?: NullableIntFieldUpdateOperationsInput | number | null
    title?: NullableStringFieldUpdateOperationsInput | string | null
    pdfUrl?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    attachments?: FormAttachmentUpdateManyWithoutFormNestedInput
    versions?: FormVersionUpdateManyWithoutFormNestedInput
    client?: ClientUpdateOneWithoutFormsNestedInput
    createdBy?: UserUpdateOneRequiredWithoutCreatedFormsNestedInput
    updatedBy?: UserUpdateOneWithoutUpdatedFormsNestedInput
  }

  export type FormUncheckedUpdateWithoutOrganizationInput = {
    id?: IntFieldUpdateOperationsInput | number
    type?: Enumforms_typeFieldUpdateOperationsInput | $Enums.forms_type
    status?: EnumFormStatusFieldUpdateOperationsInput | $Enums.FormStatus
    year?: IntFieldUpdateOperationsInput | number
    month?: NullableIntFieldUpdateOperationsInput | number | null
    title?: NullableStringFieldUpdateOperationsInput | string | null
    clientId?: NullableIntFieldUpdateOperationsInput | number | null
    createdById?: IntFieldUpdateOperationsInput | number
    updatedById?: NullableIntFieldUpdateOperationsInput | number | null
    pdfUrl?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    attachments?: FormAttachmentUncheckedUpdateManyWithoutFormNestedInput
    versions?: FormVersionUncheckedUpdateManyWithoutFormNestedInput
  }

  export type FormUncheckedUpdateManyWithoutOrganizationInput = {
    id?: IntFieldUpdateOperationsInput | number
    type?: Enumforms_typeFieldUpdateOperationsInput | $Enums.forms_type
    status?: EnumFormStatusFieldUpdateOperationsInput | $Enums.FormStatus
    year?: IntFieldUpdateOperationsInput | number
    month?: NullableIntFieldUpdateOperationsInput | number | null
    title?: NullableStringFieldUpdateOperationsInput | string | null
    clientId?: NullableIntFieldUpdateOperationsInput | number | null
    createdById?: IntFieldUpdateOperationsInput | number
    updatedById?: NullableIntFieldUpdateOperationsInput | number | null
    pdfUrl?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OrganizationMemberUpdateWithoutOrganizationInput = {
    role?: EnumOrganizationRoleFieldUpdateOperationsInput | $Enums.OrganizationRole
    joinedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutOrganizationsNestedInput
  }

  export type OrganizationMemberUncheckedUpdateWithoutOrganizationInput = {
    id?: IntFieldUpdateOperationsInput | number
    userId?: IntFieldUpdateOperationsInput | number
    role?: EnumOrganizationRoleFieldUpdateOperationsInput | $Enums.OrganizationRole
    joinedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OrganizationMemberUncheckedUpdateManyWithoutOrganizationInput = {
    id?: IntFieldUpdateOperationsInput | number
    userId?: IntFieldUpdateOperationsInput | number
    role?: EnumOrganizationRoleFieldUpdateOperationsInput | $Enums.OrganizationRole
    joinedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WorkerUpdateWithoutOrganizationInput = {
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    address?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumWorkerRoleFieldUpdateOperationsInput | $Enums.WorkerRole
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type WorkerUncheckedUpdateWithoutOrganizationInput = {
    id?: IntFieldUpdateOperationsInput | number
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    address?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumWorkerRoleFieldUpdateOperationsInput | $Enums.WorkerRole
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type WorkerUncheckedUpdateManyWithoutOrganizationInput = {
    id?: IntFieldUpdateOperationsInput | number
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    jmbg?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    address?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumWorkerRoleFieldUpdateOperationsInput | $Enums.WorkerRole
    idCardNumber?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type FormCreateManyClientInput = {
    id?: number
    type: $Enums.forms_type
    status?: $Enums.FormStatus
    year: number
    month?: number | null
    title?: string | null
    organizationId?: number | null
    createdById: number
    updatedById?: number | null
    pdfUrl?: string | null
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FormUpdateWithoutClientInput = {
    type?: Enumforms_typeFieldUpdateOperationsInput | $Enums.forms_type
    status?: EnumFormStatusFieldUpdateOperationsInput | $Enums.FormStatus
    year?: IntFieldUpdateOperationsInput | number
    month?: NullableIntFieldUpdateOperationsInput | number | null
    title?: NullableStringFieldUpdateOperationsInput | string | null
    pdfUrl?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    attachments?: FormAttachmentUpdateManyWithoutFormNestedInput
    versions?: FormVersionUpdateManyWithoutFormNestedInput
    createdBy?: UserUpdateOneRequiredWithoutCreatedFormsNestedInput
    organization?: OrganizationUpdateOneWithoutFormsNestedInput
    updatedBy?: UserUpdateOneWithoutUpdatedFormsNestedInput
  }

  export type FormUncheckedUpdateWithoutClientInput = {
    id?: IntFieldUpdateOperationsInput | number
    type?: Enumforms_typeFieldUpdateOperationsInput | $Enums.forms_type
    status?: EnumFormStatusFieldUpdateOperationsInput | $Enums.FormStatus
    year?: IntFieldUpdateOperationsInput | number
    month?: NullableIntFieldUpdateOperationsInput | number | null
    title?: NullableStringFieldUpdateOperationsInput | string | null
    organizationId?: NullableIntFieldUpdateOperationsInput | number | null
    createdById?: IntFieldUpdateOperationsInput | number
    updatedById?: NullableIntFieldUpdateOperationsInput | number | null
    pdfUrl?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    attachments?: FormAttachmentUncheckedUpdateManyWithoutFormNestedInput
    versions?: FormVersionUncheckedUpdateManyWithoutFormNestedInput
  }

  export type FormUncheckedUpdateManyWithoutClientInput = {
    id?: IntFieldUpdateOperationsInput | number
    type?: Enumforms_typeFieldUpdateOperationsInput | $Enums.forms_type
    status?: EnumFormStatusFieldUpdateOperationsInput | $Enums.FormStatus
    year?: IntFieldUpdateOperationsInput | number
    month?: NullableIntFieldUpdateOperationsInput | number | null
    title?: NullableStringFieldUpdateOperationsInput | string | null
    organizationId?: NullableIntFieldUpdateOperationsInput | number | null
    createdById?: IntFieldUpdateOperationsInput | number
    updatedById?: NullableIntFieldUpdateOperationsInput | number | null
    pdfUrl?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FormAttachmentCreateManyFormInput = {
    id?: number
    fileName: string
    fileUrl: string
    mimeType?: string | null
    createdAt?: Date | string
  }

  export type FormVersionCreateManyFormInput = {
    id?: number
    versionNumber: number
    data: string
    pdfUrl?: string | null
    createdAt?: Date | string
  }

  export type FormAttachmentUpdateWithoutFormInput = {
    fileName?: StringFieldUpdateOperationsInput | string
    fileUrl?: StringFieldUpdateOperationsInput | string
    mimeType?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FormAttachmentUncheckedUpdateWithoutFormInput = {
    id?: IntFieldUpdateOperationsInput | number
    fileName?: StringFieldUpdateOperationsInput | string
    fileUrl?: StringFieldUpdateOperationsInput | string
    mimeType?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FormAttachmentUncheckedUpdateManyWithoutFormInput = {
    id?: IntFieldUpdateOperationsInput | number
    fileName?: StringFieldUpdateOperationsInput | string
    fileUrl?: StringFieldUpdateOperationsInput | string
    mimeType?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FormVersionUpdateWithoutFormInput = {
    versionNumber?: IntFieldUpdateOperationsInput | number
    data?: StringFieldUpdateOperationsInput | string
    pdfUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FormVersionUncheckedUpdateWithoutFormInput = {
    id?: IntFieldUpdateOperationsInput | number
    versionNumber?: IntFieldUpdateOperationsInput | number
    data?: StringFieldUpdateOperationsInput | string
    pdfUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FormVersionUncheckedUpdateManyWithoutFormInput = {
    id?: IntFieldUpdateOperationsInput | number
    versionNumber?: IntFieldUpdateOperationsInput | number
    data?: StringFieldUpdateOperationsInput | string
    pdfUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}