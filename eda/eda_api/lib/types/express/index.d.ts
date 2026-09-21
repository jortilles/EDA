declare namespace Express {
	export interface Request {
        body?: any;
        user?: any;
        qs?: any;
    	[key: string]: any;
	}

	export interface Response {
		[key: string]: any;
	}
	
	export interface NextFunction {}

	export interface Application {
		_get: any;
	}

}
