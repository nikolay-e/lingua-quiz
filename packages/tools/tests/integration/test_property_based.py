"""
Property-based tests using Hypothesis for robust testing.

These tests verify invariants that should hold for any valid input.
"""

from hypothesis import assume, given, settings
from hypothesis import strategies as st


class TestLemmatizationProperties:
    @given(word=st.text(alphabet="abcdefghijklmnopqrstuvwxyz", min_size=2, max_size=20))
    @settings(max_examples=50, deadline=None)
    def test_lemma_is_string(self, word):
        from vocab_tools.core.lemmatization_service import get_lemmatization_service

        assume(word.strip())
        service = get_lemmatization_service("en")
        result = service.lemmatize(word)

        assert isinstance(result, str)
        assert len(result) > 0

    @given(word=st.text(alphabet="abcdefghijklmnñopqrstuvwxyzáéíóú", min_size=2, max_size=20))
    @settings(max_examples=50, deadline=None)
    def test_spanish_lemma_not_longer_than_double(self, word):
        from vocab_tools.core.lemmatization_service import get_lemmatization_service

        assume(word.strip())
        service = get_lemmatization_service("es")
        result = service.lemmatize(word)

        assert len(result) <= len(word) * 2

    @given(
        words=st.lists(st.text(alphabet="abcdefghijklmnopqrstuvwxyz", min_size=2, max_size=15), min_size=1, max_size=10)
    )
    @settings(max_examples=30, deadline=None)
    def test_batch_preserves_count(self, words):
        from vocab_tools.core.lemmatization_service import get_lemmatization_service

        assume(all(w.strip() for w in words))
        service = get_lemmatization_service("en")
        results = service.lemmatize_batch(words)

        assert len(results) == len(words)


class TestFrequencyServiceProperties:
    @given(word=st.text(alphabet="abcdefghijklmnopqrstuvwxyz", min_size=2, max_size=15))
    @settings(max_examples=50, deadline=None)
    def test_zipf_in_valid_range(self, word):
        from vocab_tools.core.frequency_service import get_frequency_service

        assume(word.strip())
        service = get_frequency_service("en")
        zipf = service.get_zipf(word)

        assert 0.0 <= zipf <= 8.0

    @given(word=st.text(alphabet="abcdefghijklmnopqrstuvwxyz", min_size=2, max_size=15))
    @settings(max_examples=50, deadline=None)
    def test_frequency_non_negative(self, word):
        from vocab_tools.core.frequency_service import get_frequency_service

        assume(word.strip())
        service = get_frequency_service("en")
        freq = service.get_frequency(word)

        assert freq >= 0.0


class TestProcessorProperties:
    @given(text=st.text(min_size=1, max_size=50))
    @settings(max_examples=30, deadline=None)
    def test_normalize_returns_lowercase(self, text):
        from vocab_tools.processors import get_processor

        assume(text.strip())
        processor = get_processor("es")
        result = processor.normalize(text)

        assert result == result.lower()
