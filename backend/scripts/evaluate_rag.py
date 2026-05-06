"""RAGAS evaluation script for LEXIA RAG pipeline."""
import asyncio
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from datasets import Dataset
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_recall, context_precision

from backend.app.services.retrieval import hybrid_search
from backend.app.services.llm import synthesize_answer

TEST_FIRM_ID = os.environ.get("TEST_FIRM_ID", "test-firm")
THRESHOLD = 0.7
REPORT_PATH = Path(__file__).parent / "rag_report.json"


async def run_test_case(case: dict) -> dict:
    question = case["question"]
    ground_truth = case["ground_truth"]

    chunks = await hybrid_search(query=question, firm_id=TEST_FIRM_ID)
    contexts = [c.content for c in chunks] if chunks else [""]

    chunks_for_synth = [{"content": c.content, "metadata": c.metadata, "document_name": "test"} for c in chunks]
    answer = await synthesize_answer(question, chunks_for_synth) if chunks else "No context available."

    return {
        "question": question,
        "answer": answer,
        "contexts": contexts,
        "ground_truth": ground_truth,
    }


async def main() -> None:
    test_cases_path = Path(__file__).parent.parent / "tests" / "rag_test_cases.json"
    test_cases = json.loads(test_cases_path.read_text())

    print(f'{{"step": "start", "cases": {len(test_cases)}}}')

    results = []
    for i, case in enumerate(test_cases):
        print(f'{{"step": "running_case", "index": {i}, "question": "{case["question"][:60]}..."}}')
        result = await run_test_case(case)
        results.append(result)

    dataset = Dataset.from_list(results)
    scores = evaluate(
        dataset,
        metrics=[faithfulness, answer_relevancy, context_recall, context_precision],
    )
    scores_dict = scores.to_pandas().mean().to_dict()

    report = {"scores": scores_dict, "cases": len(test_cases), "threshold": THRESHOLD}
    REPORT_PATH.write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))

    failed = [m for m, v in scores_dict.items() if isinstance(v, float) and v < THRESHOLD]
    if failed:
        print(f"QUALITY REGRESSION: metrics below {THRESHOLD}: {failed}")
        sys.exit(1)

    print('{"step": "evaluation_passed"}')


if __name__ == "__main__":
    asyncio.run(main())
