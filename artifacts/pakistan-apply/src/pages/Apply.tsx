import { useParams, useLocation } from "wouter";
import { useGetUniversity, useListPrograms, getGetUniversityQueryKey, getListProgramsQueryKey } from "@workspace/api-client-react";
import AppLayout from "@/components/AppLayout";
import { Link } from "wouter";
import UniversityDetail from "./UniversityDetail";

export default function Apply() {
  return <UniversityDetail />;
}
