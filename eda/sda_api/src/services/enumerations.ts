
export class Enumerations {


    public static enumeration_to_column(ennumeration: any) {
        
        let enumInput = {}

            if (ennumeration.bridge_table != null && ennumeration.source_bridge != null && ennumeration.target_bridge != null ) {
                 
                enumInput = {
                    "target_table": ennumeration.master_table,
                    "target_id_column": ennumeration.master_id,
                    "target_description_column": ennumeration.master_column,
                    "bridge_table": ennumeration.bridge_table,
                    "source_bridge": ennumeration.source_bridge,
                    "target_bridge": ennumeration.target_bridge
                }

            } else {
                
                enumInput = {
                    "target_table": ennumeration.master_table,
                    "target_id_column": ennumeration.master_id,
                    "target_description_column": ennumeration.master_column
                }
        
            }


        return enumInput


    }

}