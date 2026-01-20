from pydantic import BaseModel, ConfigDict


class APIBaseModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
