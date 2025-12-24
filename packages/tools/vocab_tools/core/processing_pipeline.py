from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ProcessingContext:
    word: str
    metadata: dict[str, Any] = field(default_factory=dict)
    normalized: str | None = None
    lemma: str | None = None
    pos_tag: str | None = None
    morphology: dict[str, Any] | None = None
    frequency: float | None = None
    category: str | None = None
    should_filter: bool = False
    filter_stage: str | None = None
    filter_reason: str | None = None


class ProcessingStage(ABC):
    @abstractmethod
    def process(self, context: ProcessingContext) -> ProcessingContext:
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        pass


class ProcessingPipeline:
    def __init__(self, stages: list[ProcessingStage]):
        self.stages = stages

    def process(self, context: ProcessingContext) -> ProcessingContext:
        for stage in self.stages:
            if context.should_filter:
                break
            context = stage.process(context)
        return context
