export namespace main {
	
	export class ExcalidrawFile {
	    id: string;
	    userId: string;
	    name: string;
	    data?: string;
	    thumbnail?: string;
	    createdAt: string;
	    updatedAt: string;
	    isPublic: boolean;
	    inStorage: string;
	
	    static createFrom(source: any = {}) {
	        return new ExcalidrawFile(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.userId = source["userId"];
	        this.name = source["name"];
	        this.data = source["data"];
	        this.thumbnail = source["thumbnail"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	        this.isPublic = source["isPublic"];
	        this.inStorage = source["inStorage"];
	    }
	}

}

