CREATE TABLE "Alias" (
	"alias" text NOT NULL,
	"isDisplayAlias" boolean NOT NULL,
	"roomId" text NOT NULL,
	CONSTRAINT "Alias_pkey" PRIMARY KEY("roomId","alias")
);
--> statement-breakpoint
CREATE TABLE "Building" (
	"buildingCode" text NOT NULL,
	"name" text NOT NULL,
	"osmId" text,
	"labelLatitude" double precision NOT NULL,
	"labelLongitude" double precision NOT NULL,
	"shape" jsonb NOT NULL,
	"hitbox" jsonb,
	"defaultOrdinal" integer,
	CONSTRAINT "Building_pkey" PRIMARY KEY("buildingCode")
);
--> statement-breakpoint
CREATE TABLE "Edge" (
	"inNodeId" text NOT NULL,
	"outNodeId" text NOT NULL,
	CONSTRAINT "Edge_pkey" PRIMARY KEY("inNodeId","outNodeId")
);
--> statement-breakpoint
CREATE TABLE "Floor" (
	"buildingCode" text NOT NULL,
	"floorLevel" text NOT NULL,
	"isDefault" boolean NOT NULL,
	"centerX" double precision NOT NULL,
	"centerY" double precision NOT NULL,
	"centerLatitude" double precision NOT NULL,
	"centerLongitude" double precision NOT NULL,
	"scale" double precision NOT NULL,
	"angle" double precision NOT NULL,
	"altitude" double precision,
	CONSTRAINT "Floor_pkey" PRIMARY KEY("buildingCode","floorLevel")
);
--> statement-breakpoint
CREATE TABLE "Node" (
	"nodeId" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"buildingCode" text,
	"floorLevel" text,
	"roomId" text,
	CONSTRAINT "Node_pkey" PRIMARY KEY("nodeId")
);
--> statement-breakpoint
CREATE TABLE "Poi" (
	"poiId" text NOT NULL,
	"type" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"buildingCode" text,
	"floorLevel" text,
	CONSTRAINT "Poi_pkey" PRIMARY KEY("poiId")
);
--> statement-breakpoint
CREATE TABLE "Room" (
	"roomId" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"labelLatitude" double precision NOT NULL,
	"labelLongitude" double precision NOT NULL,
	"polygon" jsonb NOT NULL,
	"buildingCode" text,
	"floorLevel" text,
	CONSTRAINT "Room_pkey" PRIMARY KEY("roomId")
);
--> statement-breakpoint
ALTER TABLE "Alias" ADD CONSTRAINT "Alias_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("roomId") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Edge" ADD CONSTRAINT "Edge_inNodeId_fkey" FOREIGN KEY ("inNodeId") REFERENCES "public"."Node"("nodeId") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Edge" ADD CONSTRAINT "Edge_outNodeId_fkey" FOREIGN KEY ("outNodeId") REFERENCES "public"."Node"("nodeId") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Floor" ADD CONSTRAINT "Floor_buildingCode_fkey" FOREIGN KEY ("buildingCode") REFERENCES "public"."Building"("buildingCode") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Node" ADD CONSTRAINT "Node_buildingCode_floorLevel_fkey" FOREIGN KEY ("buildingCode","floorLevel") REFERENCES "public"."Floor"("buildingCode","floorLevel") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Node" ADD CONSTRAINT "Node_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("roomId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Poi" ADD CONSTRAINT "Poi_buildingCode_floorLevel_fkey" FOREIGN KEY ("buildingCode","floorLevel") REFERENCES "public"."Floor"("buildingCode","floorLevel") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Room" ADD CONSTRAINT "Room_buildingCode_floorLevel_fkey" FOREIGN KEY ("buildingCode","floorLevel") REFERENCES "public"."Floor"("buildingCode","floorLevel") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "Node_buildingCode_floorLevel_idx" ON "Node" USING btree ("buildingCode","floorLevel");--> statement-breakpoint
CREATE INDEX "Poi_buildingCode_floorLevel_idx" ON "Poi" USING btree ("buildingCode","floorLevel");--> statement-breakpoint
CREATE INDEX "Room_buildingCode_floorLevel_idx" ON "Room" USING btree ("buildingCode","floorLevel");
